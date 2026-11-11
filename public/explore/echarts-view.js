/* Optional ECharts renderer for the explorer's existing simulation grid. */
function createEChartsView(container, status, selectCell) {
  const downloads = new Map();
  let chart;
  let revision = 0;
  let activeGrid, activeKind;
  const resize = new ResizeObserver(() => {
    if (chart && (chart.getWidth() !== container.clientWidth || chart.getHeight() !== container.clientHeight))
      chart.resize();
  });
  let webglAvailable;
  function supportsSurface() {
    if (webglAvailable === undefined) {
      const probe = document.createElement('canvas').getContext('webgl');
      webglAvailable = Boolean(probe);
      probe?.getExtension('WEBGL_lose_context')?.loseContext();
    }
    return webglAvailable;
  }

  function load(file) {
    if (!downloads.has(file)) {
      const promise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/assets/vendor/' + file;
        script.onload = resolve;
        script.onerror = () => {
          script.remove();
          reject(new Error('Chart download failed. Select the view again to retry.'));
        };
        document.head.append(script);
      });
      downloads.set(file, promise.catch(error => {
        downloads.delete(file);
        throw error;
      }));
    }
    return downloads.get(file);
  }

  function close() {
    revision++;
    resize.disconnect();
    chart?.dispose();
    chart = null;
    activeGrid = activeKind = null;
    container.hidden = true;
    status.textContent = '';
  }

  async function show(grid, kind) {
    if (!kind && chart && grid === activeGrid) {
      revision++;
      resize.disconnect();
      container.hidden = true;
      status.textContent = '';
      return;
    }
    if (chart && grid === activeGrid && kind === activeKind) {
      container.hidden = false;
      resize.observe(container);
      const metric = window.AyFluxExplore.metrics[grid.metric];
      status.textContent = metric.label+' ('+metric.unit+')';
      return;
    }
    close();
    if (!grid || !kind) return;
    const current = revision;
    status.textContent = 'Loading chart…';
    try {
      await load('echarts-5.6.0.min.js');
      if (current !== revision) return;
      const surface = kind === 'surface';
      if (surface) {
        await load('echarts-gl-2.0.9.min.js');
        if (current !== revision) return;
        if (!supportsSurface()) throw new Error('WebGL is unavailable. Select the 2D heatmap.');
      }
      const model = window.AyFluxExplore;
      const metric = model.metrics[grid.metric];
      const xName = model.axes[grid.xKey].label;
      const yName = model.axes[grid.yKey].label;
      const data = grid.ys.flatMap((y,j) => grid.xs.map((x,i) =>
        [surface ? x : i, surface ? y : j, grid.z[j][i]]));
      const values = grid.z.flat();
      const min = Math.min(...values), max = Math.max(...values);
      container.hidden = false;
      chart = window.echarts.init(container);
      const option = {
        animation:false,
        tooltip:{renderMode:'richText',formatter:point => {
          const [x,y,value] = point.value;
          return [xName+' '+(surface?x:grid.xs[x]), yName+' '+(surface?y:grid.ys[y]),
            metric.label+' '+Number(value.toPrecision(5))+' '+metric.unit].join('\n');
        }},
        visualMap:{dimension:2,min,max:max===min?min+1:max,orient:'horizontal',left:'center',bottom:0,
          inRange:{color:['#edf5fa','#76b3d3','#155383']}},
        series:[{type:kind,data,...(surface ? {dataShape:[grid.ys.length,grid.xs.length],shading:'color'} : {})}]
      };
      if (surface) {
        option.grid3D = {temporalSuperSampling:{enable:false},viewControl:{projection:'perspective'}};
        option.xAxis3D = {type:'value',name:xName,scale:true};
        option.yAxis3D = {type:'value',name:yName,scale:true};
        option.zAxis3D = {type:'value',name:metric.label+' ('+metric.unit+')',scale:true};
      } else {
        option.grid = {left:60,right:22,top:35,bottom:78};
        option.xAxis = {type:'category',data:grid.xs,name:xName,nameLocation:'middle',nameGap:28};
        option.yAxis = {type:'category',data:grid.ys,name:yName};
      }
      chart.setOption(option);
      activeGrid = grid;
      activeKind = kind;
      chart.on('click', 'series', point => {
        const index = point.dataIndex;
        if (Number.isInteger(index) && index>=0 && index<data.length)
          selectCell(index % grid.xs.length, Math.floor(index/grid.xs.length));
      });
      resize.observe(container);
      status.textContent = metric.label+' ('+metric.unit+')';
    } catch (error) {
      if (current !== revision) return;
      close();
      status.textContent = error.message;
    }
  }
  return {show,close};
}
