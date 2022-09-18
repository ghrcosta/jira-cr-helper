let jiraUrl = null
let componentList = []


window.onload = function() {
  // Setup settings button
  document.getElementById("button_settings").addEventListener("click", async () => {
    chrome.tabs.create({ url: "options.html" })
  })

  // Load component list
  chrome.storage.sync.get({KEY_COMPONENT_LIST: []}, function(fetchResult){
    componentList = fetchResult.KEY_COMPONENT_LIST
    buildComponentList()
  })

  // Setup notification warning when selecting Bug/Defect CR types
  for (const radio of document.querySelectorAll('input[name="type"]')) {
    radio.addEventListener("change", async () => {
      const issueType = document.querySelector('input[name="type"]:checked').value
      document.getElementById("component_bug_alert").hidden = (issueType != 1 && issueType != 4)
    })
  }

  // Setup "Go to JIRA" button
  document.getElementById("button_go_to_jira").addEventListener("click", async () => {
    goToJira()
  })
}


/**
 * Creates the dropdown menu for components.
 */
function buildComponentList() {
  const componentSelector = document.getElementById("component")

  for (const component of componentList) {
    var option = document.createElement("option")
    option.value = component.name
    option.innerText = component.name
    componentSelector.appendChild(option)
  }
}


/**
 * "Go to Jira" button action.
 * Parses the choosen parameters, creates the Jira URL and opens it in a new tab.
 */
function goToJira() {
  const issueType = document.querySelector('input[name="type"]:checked').value
  const priority = document.querySelector('input[name="priority"]:checked').value

  let jiraUrl = JIRA_URL_PREFIX+"/secure/CreateIssueDetails!init.jspa?pid="+PROJECT_ID+"&issuetype="+issueType+"&priority="+priority
  
  const componentSelectedName = document.getElementById("component").value
  let componentSelected = null
  for (const component of componentList) {
    if (component.name === componentSelectedName) {
      componentSelected = component
    }
  }

  if (componentSelected != null) {
    jiraUrl += "&component="+componentSelected.name
    if (issueType != 1 && issueType != 4) {
      let description = componentSelected.description.trim()
      if (description.length > 0) {
        jiraUrl += "&description="+parseDescription(description)
      }
    }
  }

  chrome.tabs.create({ url: jiraUrl })
}


/**
 * Handles special characters in the description text.
 * @param {string} text Description to parse
 * @returns Description text with special characters replaces.
 */
function parseDescription(text) {
  return text.trim().replace(/\n/g, "%0A")  // HTML links don't work with \n
}