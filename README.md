# jira-cr-helper

Browser extension to simplify creating Jira CRs with default values. Note that
some of the variables are hardcoded, you will need to change them before using
this extension.



## Environment configuration / Deploy

1. Chrome > Menu > More Tools > Extensions > Enable "Developer Mode"
2. On the Extensions page, click "Load unpacked" and select this root directory



## Edits required

* common.js
  * Jira base URL
  * Project ID
* popup.html
  * List of CR types and their IDs
  * List of priorities and their IDs
* popup.js
  * CR types that must not show default description



## Improvement ideas

Not sure if I'll ever do any of these, but...

* Improve UI using libraries and whatnot
* Real integration with Jira
* Firefox version
* Tests