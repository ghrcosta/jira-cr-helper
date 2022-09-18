const JIRA_URL_PREFIX="http://jira.atlassian.com"
let jiraUrl = null


const KEY_PROJECT="KEY_PROJECT"
const PROJECT_DEFAULT="00000"
let project = null


const KEY_COMPONENT_LIST="KEY_COMPONENT_LIST"
let componentList = []


window.onload = function() {
  // Setup settings button
  document.getElementById("button_settings").addEventListener("click", async () => {
    chrome.tabs.create({ url: "options.html" })
  })

  // Load initial value for project
  chrome.storage.sync.get({KEY_PROJECT}, function(fetchResult){
    project = (fetchResult.KEY_PROJECT !== KEY_PROJECT) ? fetchResult.KEY_PROJECT : ""
    document.getElementById("project").innerText = project

    if (!project || project.trim().length == 0 || project === PROJECT_DEFAULT) {
      document.getElementById("button_go_to_jira").disabled = true
      document.getElementById("project_alert").hidden = false
    }
  })

  chrome.storage.sync.get({KEY_COMPONENT_LIST}, function(fetchResult){
    componentList = fetchResult.KEY_COMPONENT_LIST
    buildComponentList()
  })

  // Setup "Go to JIRA" button
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


function buildComponentList() {
  const componentSelector = document.getElementById("component")

  for (const component of componentList) {
    var option = document.createElement("option")
    option.value = component.name
    option.innerText = component.name
    componentSelector.appendChild(option)
  }
}


function goToJira() {
  const issueType = document.querySelector('input[name="type"]:checked').value
  const priority = document.querySelector('input[name="priority"]:checked').value

  let jiraUrl = JIRA_URL_PREFIX+"/secure/CreateIssueDetails!init.jspa?pid="+project+"&issuetype="+issueType+"&priority="+priority
  
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


function parseDescription(text) {
  return text.trim().replace(/\n/g, "%0A")  // HTML links don't work with \n
}