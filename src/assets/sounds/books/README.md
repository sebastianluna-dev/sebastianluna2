# Book recordings

The eight book sounds of Kenney's "RPG Audio" pack (https://kenney.nl/assets/rpg-audio, CC0, see
`LICENSE.txt`: free for commercial use, no credit required). Sebastian picked them by ear on
2026-11-09; the site plays `page-turn-slow.mp3` when an /about book opens and when it closes
(`src/lib/sound/samples.ts`). The other seven stay here so the choice can change without a new
download.

| #   | File                  | Pack file      | Length | Peak (dBFS) | Mean (dB) | What it is                    |
| --- | --------------------- | -------------- | ------ | ----------- | --------- | ----------------------------- |
| 1   | `book-open.mp3`       | bookOpen.ogg   | 79 ms  | −6.5        | −24.6     | A book opening                |
| 2   | `book-close.mp3`      | bookClose.ogg  | 208 ms | −4.3        | −23.4     | A book closing                |
| 3   | `pages-riffle.mp3`    | bookFlip1.ogg  | 623 ms | −0.2        | −29.5     | Several pages turned in a row |
| 4   | `page-turn-slow.mp3`  | bookFlip2.ogg  | 366 ms | −3.5        | −30.7     | One page turned slowly (used) |
| 5   | `page-turn-quick.mp3` | bookFlip3.ogg  | 181 ms | −3.4        | −29.0     | One page turned quickly       |
| 6   | `book-place-1.mp3`    | bookPlace1.ogg | 205 ms | −6.2        | −23.9     | A book set down on a table    |
| 7   | `book-place-2.mp3`    | bookPlace2.ogg | 257 ms | −5.9        | −23.5     | A book set down, second take  |
| 8   | `book-place-3.mp3`    | bookPlace3.ogg | 218 ms | −6.1        | −23.7     | A book set down, third take   |

Each file is the pack's Ogg, mixed to mono, with the silence trimmed at both ends (−50 dB at the
start, −55 dB at the end), turned up or down toward a −24 dB mean unless that would push the peak
past −3 dBFS (the page turns hit that limit first, so they sit lower), given a 30 ms fade out and
encoded as 128 kbps MP3 at 48 kHz (every browser decodes MP3 with Web Audio). The encoder moves
peaks a little: `pages-riffle.mp3` came out at −0.2 dBFS. The table shows the levels measured on
the MP3s (`ffmpeg -af volumedetect`). For one file:

```sh
ffmpeg -i bookFlip2.ogg -ac 1 \
  -af "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-55dB,areverse" \
  trimmed.wav
# measure with -af volumedetect, then: gain = min(-24 - mean, -3 - max)
ffmpeg -i trimmed.wav -af "volume=<gain>dB,afade=t=out:st=<length - 0.03>:d=0.03" \
  -c:a libmp3lame -b:a 128k page-turn-slow.mp3
```
