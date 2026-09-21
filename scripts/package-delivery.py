"""Package tracked website source plus the already-tested portable build; never Git history."""
from pathlib import Path
import hashlib, subprocess, zipfile
root=Path(__file__).resolve().parents[1]
out=root/'delivery-artifact';out.mkdir(exist_ok=True)
archive=out/'auradio_web_complete.zip'
tracked=subprocess.check_output(['git','ls-files','-z'],cwd=root).decode().split('\0')
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=7) as z:
    for name in sorted(filter(None,tracked)):
        path=root/name
        if not path.is_file() or path.is_symlink(): continue
        if any(part in ('.git','node_modules','verification','qa-output','delivery-artifact') for part in path.relative_to(root).parts): continue
        if path.suffix.lower() in ('.woff','.woff2','.ttf','.otf','.ttc','.apk','.map'): raise RuntimeError('Unexpected private/large asset: '+name)
        z.write(path,'auradio_web/'+name)
    for path in sorted((root/'dist').rglob('*')):
        if path.is_file(): z.write(path,'auradio_web/'+str(path.relative_to(root)))
sha=hashlib.sha256(archive.read_bytes()).hexdigest()
(out/'SHA256SUMS.txt').write_text(sha+'  '+archive.name+'\n')
print(f'PACKAGED {archive.name}: {archive.stat().st_size} bytes; SHA256 {sha}')
