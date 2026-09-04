import { describe, expect, it } from "vitest";
import { sniff, humanBytes } from "@/lib/storage";

const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(20)]);
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(20)]);
const pdf = Buffer.concat([Buffer.from("%PDF-1.7"), Buffer.alloc(20)]);
const elf = Buffer.concat([Buffer.from([0x7f, 0x45, 0x4c, 0x46]), Buffer.alloc(20)]);
const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>x</script></svg>');

describe("file type sniffing", () => {
  it("recognises a JPEG by its bytes", () => expect(sniff(jpeg)?.mime).toBe("image/jpeg"));
  it("recognises a PNG by its bytes", () => expect(sniff(png)?.mime).toBe("image/png"));
  it("recognises a PDF by its bytes", () => expect(sniff(pdf)?.mime).toBe("application/pdf"));

  it("refuses an executable however it is named", () => expect(sniff(elf)).toBeNull());
  it("refuses SVG, which can carry script", () => expect(sniff(svg)).toBeNull());
  it("refuses a file too short to identify", () => expect(sniff(Buffer.alloc(4))).toBeNull());

  it("ignores a misleading extension: the bytes decide", () => {
    // A file named "photo.jpg" that is really an executable.
    expect(sniff(elf)).toBeNull();
    // A file named "notes.txt" that is really a PNG is still accepted as a PNG.
    expect(sniff(png)?.kind).toBe("image");
  });
});

describe("humanBytes", () => {
  it("formats sensibly", () => {
    expect(humanBytes(512)).toBe("512 B");
    expect(humanBytes(2048)).toBe("2 KB");
    expect(humanBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});
