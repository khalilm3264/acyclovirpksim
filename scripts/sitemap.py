"""Check the published sitemap, or regenerate it with --write."""
import argparse
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import quote
from xml.etree import ElementTree as ET

PUBLIC = Path(__file__).resolve().parents[1] / "public"
ORIGIN = "https://ayflux.org"
NS = "http://www.sitemaps.org/schemas/sitemap/0.9"


class IndexingPolicy(HTMLParser):
    excluded = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "meta" and attrs.get("name", "").lower() in {"robots", "googlebot"}:
            directives = attrs.get("content", "").lower().replace(",", " ").split()
            if {"noindex", "none"}.intersection(directives):
                self.excluded = True


def page_urls():
    for page in sorted(PUBLIC.rglob("*.html")):
        policy = IndexingPolicy()
        policy.feed(page.read_text(encoding="utf-8"))
        if policy.excluded:
            continue
        route = "/" + page.relative_to(PUBLIC).as_posix()
        # Cloudflare auto-trailing-slash maps index files to directories
        # and individual HTML files to extensionless paths.
        if page.name == "index.html":
            route = route.removesuffix("index.html")
        else:
            route = route.removesuffix(".html")
        yield ORIGIN + quote(route)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true")
    urls = sorted(page_urls())
    sitemap = PUBLIC / "sitemap.xml"
    if parser.parse_args().write:
        root = ET.Element("urlset", xmlns=NS)
        for url in urls:
            ET.SubElement(ET.SubElement(root, "url"), "loc").text = url
        ET.indent(root)
        sitemap.write_bytes(ET.tostring(root, encoding="utf-8", xml_declaration=True) + b"\n")
    actual = ET.parse(sitemap).findall(f"{{{NS}}}url/{{{NS}}}loc")
    if sorted(node.text for node in actual) != urls:
        raise SystemExit("Sitemap differs from indexable pages. Run python3 scripts/sitemap.py --write")
    if f"Sitemap: {ORIGIN}/sitemap.xml" not in (PUBLIC / "robots.txt").read_text().splitlines():
        raise SystemExit("robots.txt is missing the sitemap URL")
    print(f"Verified {len(urls)} sitemap entries and robots.txt discovery")
