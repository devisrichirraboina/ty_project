import os
import zipfile
import re
import html

def create_docx(md_filepath, docx_filepath):
    with open(md_filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')

    # Base XML Templates
    content_types = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>'''

    rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>'''

    word_rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>'''

    styles = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
        <w:sz w:val="24"/>
        <w:szCs w:val="24"/>
        <w:lang w:val="en-US"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:line="360" w:lineRule="auto" w:after="160"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:pPr>
      <w:spacing w:before="360" w:after="180"/>
      <w:jc w:val="center"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:color w:val="0F172A"/>
      <w:sz w:val="34"/>
      <w:szCs w:val="34"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:pPr>
      <w:spacing w:before="240" w:after="120"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:color w:val="1E293B"/>
      <w:sz w:val="28"/>
      <w:szCs w:val="28"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:pPr>
      <w:spacing w:before="180" w:after="80"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:color w:val="334155"/>
      <w:sz w:val="25"/>
      <w:szCs w:val="25"/>
    </w:rPr>
  </w:style>
</w:styles>'''

    doc_body = []
    in_table = False
    table_rows = []
    in_code = False
    code_lines = []

    def clean_text(t):
        return html.escape(t).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

    def parse_inline_runs(text):
        # Splits bold and normal
        runs = []
        # Pattern for bold **text** or *text*
        parts = re.split(r'(\*\*.*?\*\*|`.*?`|\*.*?\*)', text)
        for part in parts:
            if not part:
                continue
            if part.startswith('**') and part.endswith('**'):
                inner = html.escape(part[2:-2])
                runs.append(f'<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">{inner}</w:t></w:r>')
            elif part.startswith('*') and part.endswith('*'):
                inner = html.escape(part[1:-1])
                runs.append(f'<w:r><w:rPr><w:i/></w:rPr><w:t xml:space="preserve">{inner}</w:t></w:r>')
            elif part.startswith('`') and part.endswith('`'):
                inner = html.escape(part[1:-1])
                runs.append(f'<w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="20"/><w:highlight w:val="lightGray"/></w:rPr><w:t xml:space="preserve">{inner}</w:t></w:r>')
            else:
                inner = html.escape(part)
                runs.append(f'<w:r><w:t xml:space="preserve">{inner}</w:t></w:r>')
        return "".join(runs)

    def flush_table(rows):
        if not rows:
            return ""
        xml = ['<w:tbl>',
               '<w:tblPr>',
               '<w:tblW w:w="5000" w:type="pct"/>',
               '<w:tblBorders>',
               '<w:top w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>',
               '<w:left w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>',
               '<w:bottom w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>',
               '<w:right w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>',
               '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>',
               '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>',
               '</w:tblBorders>',
               '</w:tblPr>']
        for r_idx, row in enumerate(rows):
            xml.append('<w:tr>')
            is_hdr = (r_idx == 0)
            for cell in row:
                bg = '<w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>' if is_hdr else ''
                xml.append(f'<w:tc><w:tcPr>{bg}<w:tcMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:left w:w="140" w:type="dxa"/><w:right w:w="140" w:type="dxa"/></w:tcMar></w:tcPr>')
                runs = parse_inline_runs(cell)
                xml.append(f'<w:p><w:pPr><w:spacing w:line="260" w:lineRule="auto" w:after="0"/></w:pPr>{runs}</w:p>')
                xml.append('</w:tc>')
            xml.append('</w:tr>')
        xml.append('</w:tbl>')
        return "".join(xml)

    for line in lines:
        raw_line = line.rstrip()

        # Code block toggle
        if raw_line.startswith('```'):
            if in_code:
                # Flush code block
                joined = "\n".join(code_lines)
                for cl in code_lines:
                    escaped = html.escape(cl)
                    doc_body.append(f'<w:p><w:pPr><w:pBdr><w:left w:val="single" w:sz="24" w:space="10" w:color="3B82F6"/></w:pPr><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/><w:spacing w:line="240" w:lineRule="auto" w:after="40"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="19"/></w:rPr><w:t xml:space="preserve">{escaped}</w:t></w:r></w:p>')
                code_lines = []
                in_code = False
            else:
                if in_table:
                    doc_body.append(flush_table(table_rows))
                    table_rows = []
                    in_table = False
                in_code = True
            continue

        if in_code:
            code_lines.append(raw_line)
            continue

        # Page Break
        if raw_line == '\\newpage' or raw_line == '---':
            if in_table:
                doc_body.append(flush_table(table_rows))
                table_rows = []
                in_table = False
            doc_body.append('<w:p><w:r><w:br w:type="page"/></w:r></w:p>')
            continue

        # Tables
        if raw_line.startswith('|') and raw_line.endswith('|'):
            if re.match(r'^\|[\s\-:|]+\|$', raw_line):
                continue
            in_table = True
            cells = [c.strip() for c in raw_line.split('|')[1:-1]]
            table_rows.append(cells)
            continue
        elif in_table:
            doc_body.append(flush_table(table_rows))
            table_rows = []
            in_table = False

        # Blank line
        if not raw_line.strip():
            continue

        # Headings
        if raw_line.startswith('# '):
            runs = parse_inline_runs(raw_line[2:].strip())
            doc_body.append(f'<w:p><w:pPr><w:pStyle w:val="Heading1"/><w:jc w:val="center"/></w:pPr>{runs}</w:p>')
            continue
        if raw_line.startswith('## '):
            runs = parse_inline_runs(raw_line[3:].strip())
            doc_body.append(f'<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr>{runs}</w:p>')
            continue
        if raw_line.startswith('### '):
            runs = parse_inline_runs(raw_line[4:].strip())
            doc_body.append(f'<w:p><w:pPr><w:pStyle w:val="Heading3"/></w:pPr>{runs}</w:p>')
            continue

        # Bullet lists
        if re.match(r'^[\*\-]\s+', raw_line):
            text_body = re.sub(r'^[\*\-]\s+', '', raw_line)
            runs = parse_inline_runs(text_body)
            doc_body.append(f'<w:p><w:pPr><w:ind w:left="480" w:hanging="240"/><w:spacing w:line="320" w:lineRule="auto" w:after="80"/></w:pPr><w:r><w:t xml:space="preserve">&#x2022; </w:t></w:r>{runs}</w:p>')
            continue

        # Standard Paragraph
        runs = parse_inline_runs(raw_line)
        doc_body.append(f'<w:p><w:pPr><w:jc w:val="both"/><w:spacing w:line="360" w:lineRule="auto" w:after="140"/></w:pPr>{runs}</w:p>')

    if in_table:
        doc_body.append(flush_table(table_rows))

    document_xml = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    {"".join(doc_body)}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>'''

    # Package into a genuine zip .docx
    with zipfile.ZipFile(docx_filepath, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', content_types)
        z.writestr('_rels/.rels', rels)
        z.writestr('word/_rels/document.xml.rels', word_rels)
        z.writestr('word/styles.xml', styles)
        z.writestr('word/document.xml', document_xml)

    print(f"Generated clean native .docx at: {docx_filepath}")

if __name__ == '__main__':
    md = r'd:\Alphacareshivani\Alphacare\PROJECT_DOCUMENTATION_REPORT.md'
    docx = r'd:\Alphacareshivani\Alphacare\PROJECT_DOCUMENTATION_REPORT.docx'
    create_docx(md, docx)
