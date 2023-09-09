import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";

var GithubToken = process.argv[2];
var PRNumber = process.argv[3];
process.env.GITHUB_TOKEN = GithubToken;
execSync("gh pr checkout " + PRNumber);
console.info("PR #" + PRNumber + " has been checked out.");

const JSONFileName = "./Update.json";
const JSFileName = "./XMOJ.user.js";
var JSONFileContent = readFileSync(JSONFileName, "utf8");
var JSFileContent = readFileSync(JSFileName, "utf8");
var JSONObject = JSON.parse(JSONFileContent);

var LastJSONVersion = Object.keys(JSONObject.UpdateHistory)[Object.keys(JSONObject.UpdateHistory).length - 1];
var LastJSVersion = JSFileContent.match(/@version\s+(\d+\.\d+\.\d+)/)[1];
var LastVersion = LastJSVersion.split(".");
var LastPR = JSONObject.UpdateHistory[LastJSONVersion].UpdateContents[0].PR;
var LastDescription = JSONObject.UpdateHistory[LastJSONVersion].UpdateContents[0].Description;
console.log("Last JS version    : " + LastJSVersion);
console.log("Last JSON version  : " + LastJSONVersion);
console.log("Last PR            : " + LastPR);
if (LastJSONVersion.split(".")[2] != LastJSVersion.split(".")[2]) {
    console.error("XMOJ.user.js and Update.json have different patch versions.");
    process.exit(1);
}

var CurrentVersion = LastVersion[0] + "." + LastVersion[1] + "." + (parseInt(LastVersion[2]) + 1);
var CurrentPR = Number(PRNumber);
var CurrentDescription = String(process.argv[4]);
if (LastPR == CurrentPR) {
    CurrentVersion = LastJSONVersion;
}

console.log("Last description   : " + LastDescription);
console.log("Current version    : " + CurrentVersion);
console.log("Current PR         : " + CurrentPR);
console.log("Current description: " + CurrentDescription);

var ChangedFileList = execSync("gh pr diff " + CurrentPR + " --name-only").toString().split("\n");
console.log("Changed files      : " + ChangedFileList.join(", "));

let CommitMessage = "";
if (LastPR == CurrentPR) {
    console.warn("Warning: PR is the same as last version.");
    JSONObject.UpdateHistory[CurrentVersion].UpdateDate = Date.now();
    JSONObject.UpdateHistory[CurrentVersion].UpdateContents[0].Description = CurrentDescription;
    CommitMessage = "Update time and description of " + CurrentVersion;
}
else if (ChangedFileList.indexOf("XMOJ.user.js") != -1) {
    JSONObject.UpdateHistory[CurrentVersion] = {
        "UpdateDate": Date.now(),
        "Prerelease": true,
        "UpdateContents": [{
            "PR": CurrentPR,
            "Description": CurrentDescription
        }]
    };
    writeFileSync(JSFileName, JSFileContent.replace(/@version(\s+)\d+\.\d+\.\d+/, "@version$1" + CurrentVersion), "utf8");
    console.warn("XMOJ.user.js has been updated.");
    CommitMessage = "Update version info to " + CurrentVersion;
}
else {
    console.warn("XMOJ.user.js is not changed, so the version should not be updated.");
    process.exit(0);
}
console.log("Commit message     : " + CommitMessage);

writeFileSync(JSONFileName, JSON.stringify(JSONObject, null, 4), "utf8");

console.warn("Update.json has been updated.");

execSync("git config --global user.email \"github-actions[bot]@users.noreply.github.com\"");
execSync("git config --global user.name \"github-actions[bot]\"");
execSync("git commit -a -m \"" + CommitMessage + "\"");
execSync("git push");
console.log("Pushed to GitHub.");
