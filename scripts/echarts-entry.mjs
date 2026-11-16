// Share one renderer across the simulator, explorer and SVG exports.
// Register only the chart families and components used by AyFlux.
import * as echarts from 'echarts/core';
import { LineChart, BarChart, ScatterChart, CustomChart, HeatmapChart,
  BoxplotChart, ParallelChart, SankeyChart, LinesChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, ToolboxComponent, LegendComponent,
  DataZoomComponent, MarkLineComponent, MarkAreaComponent, MarkPointComponent,
  VisualMapComponent, ParallelComponent, GraphicComponent, AriaComponent,
  TitleComponent } from 'echarts/components';
import { CanvasRenderer, SVGRenderer } from 'echarts/renderers';
echarts.use([LineChart, BarChart, ScatterChart, CustomChart, HeatmapChart,
  BoxplotChart, ParallelChart, SankeyChart, LinesChart, GridComponent,
  TooltipComponent, ToolboxComponent, LegendComponent, DataZoomComponent,
  MarkLineComponent, MarkAreaComponent, MarkPointComponent, VisualMapComponent,
  ParallelComponent, GraphicComponent, AriaComponent, TitleComponent,
  CanvasRenderer, SVGRenderer]);
// Keep the public extension API available to the separately loaded ECharts GL.
export * from 'echarts/core';
