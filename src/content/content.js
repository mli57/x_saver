const SAVE_BTN_CLASS = "x-saver-btn";

function extractPostData(article) {
  const authorElement = article.querySelector('[data-testid="User-Name"]');
  const tweetTextElement = article.querySelector('[data-testid="tweetText"]');
  const timestampElement = article.querySelector("time");
  const statusLinkElement = article.querySelector('a[href*="/status/"]');

  // condition ? expressionIfTrue : expressionIfFalse
  const author = authorElement ? authorElement.innerText.trim() : "Unknown";
  const text = tweetTextElement ? tweetTextElement.innerText.trim() : "";
  const timestamp = timestampElement ? timestampElement.getAttribute("datetime") : null;
  const url = statusLinkElement ? "https://x.com" + statusLinkElement.getAttribute("href") : null;

  return { author, text, timestamp, url, savedAt: new Date().toISOString() };
}

function savePost(data) {
  chrome.storage.local.get({ posts: [] }, (result) => {
    const posts = result.posts;
    const alreadySaved = posts.some((p) => p.url === data.url);
    if (!alreadySaved) {
      posts.unshift(data);
      chrome.storage.local.set({ posts }); // saves to storage
      chrome.runtime.sendMessage({ type: "post_saved"}); // tells background.js to update count 
    }
  });
}

function addSaveButton(article) {
  // before adding save button, check if it already exists
  if (article.querySelector(`.${SAVE_BTN_CLASS}`)){ // if (.x-saver-btn), the dot makes it a CSS class selector
    return;
  }

  const btn = document.createElement("button");
  btn.className = SAVE_BTN_CLASS;
  btn.title = "Save this post";
  btn.textContent = "+ Save";

  btn.addEventListener("click", (e) => { // whenever button is clicked
    e.stopPropagation(); // allows us to save without triggering X's listener, won't open the tweet
    const data = extractPostData(article);
    savePost(data);
    btn.textContent = "Saved";
    btn.disabled = true;
  });

  // finds X's action bar (row with like/repost/reply), added save button here
  const actionBar = article.querySelector('[role="group"]');
  if (actionBar) {
    actionBar.appendChild(btn);
  }
}

function scanForPosts() {
  const articles = document.querySelectorAll('article[data-testid="tweet"]');
  articles.forEach(addSaveButton);
}

// Watch for new posts being added as the user scrolls
const observer = new MutationObserver(scanForPosts);
observer.observe(document.body, { childList: true, subtree: true });

// Initial scan
scanForPosts();
