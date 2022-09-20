let jiraUrl = null
let descriptionList = []


window.onload = function() {
  // Setup settings button
  document.getElementById("button_settings").addEventListener("click", async () => {
    chrome.tabs.create({ url: "options.html" })
  })

  // Load description list
  chrome.storage.sync.get({KEY_DESCRIPTION_LIST: []}, function(fetchResult){
    descriptionList = fetchResult.KEY_DESCRIPTION_LIST
    buildDescriptionList()
  })

  // Setup notification warning when selecting Bug/Defect CR types
  for (const radio of document.querySelectorAll('input[name="type"]')) {
    radio.addEventListener("change", async () => {
      const isBug = isCrTypeWithNoDescription()
      document.getElementById("no_description_alert").hidden = !isBug
      document.getElementById("description").disabled = isBug
      if (isBug) {
        document.getElementById("description_title").classList.add("text_disabled")
      } else {
        document.getElementById("description_title").classList.remove("text_disabled")
      }
    })
  }

  // Setup "Go to JIRA" button
  document.getElementById("button_go_to_jira").addEventListener("click", async () => {
    goToJira()
  })
}


/**
 * Creates the dropdown menu for descriptions.
 */
function buildDescriptionList() {
  const descriptionSelector = document.getElementById("description")

  for (const description of descriptionList) {
    var option = document.createElement("option")
    option.value = description.name
    option.innerText = description.name
    descriptionSelector.appendChild(option)
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
  
  const descriptionSelectedName = document.getElementById("description").value
  let descriptionSelected = null
  for (const description of descriptionList) {
    if (description.name === descriptionSelectedName) {
      descriptionSelected = description
    }
  }

  if (descriptionSelected != null && !isCrTypeWithNoDescription()) {
    let description = descriptionSelected.text.trim()
    if (description.length > 0) {
      jiraUrl += "&description="+parseDescription(description)
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


/**
 * Check if the currently select CR type is "Bug", "Defect" or "Epic"
 * @returns True if issue is Bug/Defect/Epic, False otherwise
 */
function isCrTypeWithNoDescription() {
  const issueType = document.querySelector('input[name="type"]:checked').value
  // If you change issueType values here, check if they are correct in popup.html as well
  return issueType == 1 || issueType == 5 || issueType == 74
}