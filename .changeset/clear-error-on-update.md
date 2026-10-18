---
'@data-weave/datamanager': patch
---

`LiveList` and `LiveReference` clear `hasError` and `error` after a successful update. Previously a list kept `hasError: true` after recovering, and both kept the old `error`.
