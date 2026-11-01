# Iodine (superfile)

Put ALL of these in the root of a GitHub Pages repo (served over https). You can drag them
into the GitHub web uploader all at once — each file is under the 25 MB upload limit.

- index.html    launcher
- data0.txt     packed versions (part 1)
- data1.txt     packed versions (part 2)
- sw.js         offline helper (must sit next to index.html)
- ads.txt

First time you open a version, the launcher downloads the data parts once and unpacks that
version into your browser; after that it loads straight from there, offline. Keep every file
in the same folder and do not rename them.

Must be served over https (GitHub Pages is fine) or http://localhost -- service workers do not
run from a file:// path, so double-clicking index.html locally will not fully work.
