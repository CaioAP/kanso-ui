---
'@caioalfonso/kanso-core': patch
'@caioalfonso/kanso-react': patch
'@caioalfonso/kanso-vue': patch
'@caioalfonso/kanso-styles': patch
---

Point the documentation link at the site's own domain.

The docs moved from `kanso-ui.pages.dev` to `kansoui.caioalfonso.dev`. Every
package README links to the documentation, and a README ships inside the
published tarball, so the link on each npm page only updates when a version
does.

No code change. The old URL keeps working, so this is correctness rather than a
fix.
