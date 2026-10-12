import { unzipSync } from "fflate";
/** Extract DOCX body text locally. No HTML, macros, relationships or external entities run. */
export function extractDocx(data: ArrayBuffer): string {
  const entries = unzipSync(new Uint8Array(data), {
    filter: (file) =>
      file.name === "word/document.xml" &&
      file.originalSize <= 10 * 1024 * 1024,
  });
  const body = entries["word/document.xml"];
  if (!body)
    throw Error("DOCX body is missing or exceeds the 10 MB extraction limit.");
  const xml = new TextDecoder("utf-8", { fatal: true }).decode(body);
  if (/<!DOCTYPE|<!ENTITY/i.test(xml))
    throw Error(
      "Document type/entity declarations are not allowed in DOCX extraction.",
    );
  const parsed = new DOMParser().parseFromString(xml, "application/xml");
  if (parsed.getElementsByTagName("parsererror").length)
    throw Error("DOCX contains malformed XML.");
  return Array.from(parsed.getElementsByTagNameNS("*", "p"))
    .map((p) =>
      Array.from(p.getElementsByTagNameNS("*", "t"))
        .map((t) => t.textContent ?? "")
        .join(""),
    )
    .join("\n\n");
}
