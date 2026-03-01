# Module Skill Map

| Module | Primary Targets | Secondary Targets | Evidence Signals |
|---|---|---|---|
| Word Quest | `LIT.DEC.PHG`, `LIT.DEC.SYL`, `LIT.DEC.IRREG` | `LIT.LANG.VOC` | `accuracy`, `error_pattern`, `latency`, `retrieval_strength` |
| Reading Lab | `LIT.FLU.ACC`, `LIT.FLU.PRO` | `LIT.LANG.SYN` | `wcpm`, `error_rate`, `self_correction`, `prosody_rating` |
| Sentence Surgery | `LIT.LANG.SYN` | `LIT.LANG.VOC`, `LIT.WRITE.SENT` | `sentence_repair`, `cloze`, `grammar_events` |
| Writing Studio | `LIT.WRITE.SENT`, `LIT.WRITE.PAR` | `LIT.LANG.VOC` | `sentence_quality`, `cohesion_events` |
| Decoding Diagnostic v1 | `LIT.DEC.PHG.CVC`, `LIT.DEC.PHG.DIGRAPHS`, `LIT.DEC.PHG.BLENDS`, `LIT.DEC.SYL.CLOSED`, `LIT.DEC.SYL.VCE`, `LIT.DEC.SYL.RCONTROL`, `LIT.DEC.SYL.VOWELTEAMS`, `LIT.DEC.IRREG.HF` | none | `accuracy`, `wcpm`, `attempts`, `selfCorrections`, `errorPattern` |

## Notes
- Decoding Diagnostic v1 writes evidence with `module="decodingdiag"` and activity IDs `dd.v1.timed` / `dd.v1.untimed`.
- The engine is designed for timed one-minute probes and untimed diagnostic probes with manual fallback.
