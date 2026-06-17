/*
Background.js: Runs in the background to keep the badge count on the extension icon in sync with storage
*/

// Reads from storage, count # of saved posts, sets badge number(empty str for 0 count)
function updateBadge(){
    chrome.storage.local.get({ posts: [] }, (result) => {
        const count = result.posts.length;
        chrome.action.setBadgeText({ text: count > 0 ? String(count) : ""});
    });
}

// Run on startup so badge is correct when Chrome reopens
updateBadge();

// Listen for a message from content.js saying a post was saved, only then does it update
chrome.runtime.onMessage.addListener((message) => {
if (message.type === "post_saved") {
    updateBadge();
}
});