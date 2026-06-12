// DOM references are grabbed once at startup, reused throughout
const postsEl = document.getElementById("posts");
const countEl = document.getElementById("count");
const searchEl = document.getElementById("search");
const sortEl = document.getElementById("sort");
const clearAllElements = document.getElementById("clear-all");

// list of all saved posts loaded from chrome.storage.local
let allPosts = [];

// Converts an ISO date string to a short locale date like "Jun 12, 2026"
function formatDate(iso) {
  if (!iso) {
    return "";
  }

  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Clears and re-renders the posts list from the given array.
function renderPosts(posts) {
  postsEl.innerHTML = "";

  if (posts.length === 0) {
    postsEl.innerHTML = '<p id="empty">No saved posts yet.<br>Hit "+ Save" on any post in X.</p>';
    return;
  }

  posts.forEach((post, index) => {
    const card = document.createElement("div");
    card.className = "post-card";

    // escapeHtml prevents XSS if a saved post contains angle brackets or quotes
    card.innerHTML = `
      <div class="post-author">
        ${escapeHtml(post.author)}
        <button class="post-delete" data-index="${index}" title="Remove">✕</button>
      </div>
      <div class="post-text">${escapeHtml(post.text)}</div>
      <div class="post-meta">
        ${post.timestamp ? formatDate(post.timestamp) : ""}
        · Saved ${formatDate(post.savedAt)}
      </div>
    `;

    // If click on delete button, delete, otherwise, open the original tweet
    card.addEventListener("click", (e) => {
      if (e.target.classList.contains("post-delete")){
        return;
      }
      if (post.url){
        chrome.tabs.create({ url: post.url });
      }
    });

    // stopPropagation prevents the card's click handler from also firing
    card.querySelector(".post-delete").addEventListener("click", (e) => {
      e.stopPropagation();
      deletePost(index);
    });

    postsEl.appendChild(card);
  });
}

// Safely escapes a string for HTML injection by letting the browser do the encoding.
// Setting textContent auto-escapes <, >, &, etc.; reading innerHTML gives the safe string.
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}


// Author sorts alphabetically; all other keys (savedAt, timestamp) sort newest-first.
function getSorted(posts) {
  const key = sortEl.value;

  return [...posts].sort((a, b) => {
    if (key === "author") {
      return a.author.localeCompare(b.author);
    }

    const da = new Date(a[key] || 0);
    const db = new Date(b[key] || 0);
    return db - da; // descending: newer dates come first
  });
}

// Returns only posts whose text or author contains the current search query.
function getFiltered(posts) {
  const query = searchEl.value.trim().toLowerCase();

  if (!query) { // return everything if no query
    return posts;
  }

  return posts.filter(
    (p) =>
      p.text.toLowerCase().includes(query) ||
      p.author.toLowerCase().includes(query)
  );
}

// re-renders popup: Called on load, search input, sort change
function refresh() {
  const filtered = getFiltered(getSorted(allPosts));
  countEl.textContent = `${allPosts.length} saved`;
  renderPosts(filtered);
}

// Removes a post by its position in the current filtered+sorted view.
// We can't use allPosts[index] directly because filtering may have reordered things,
// so we re-derive the same view and match on url+savedAt as a two-field unique key.
function deletePost(index) {
  const filtered = getFiltered(getSorted(allPosts));
  const post = filtered[index];
  allPosts = allPosts.filter((p) => p.url !== post.url || p.savedAt !== post.savedAt);
  chrome.storage.local.set({ posts: allPosts }, refresh);
}

// Reads all saved posts from extension storage and runs the first render
function loadData() {
  chrome.storage.local.get({ posts: [] }, (result) => {
    allPosts = result.posts;
    refresh();
  });
}

// re-render every time key is pressed
searchEl.addEventListener("input", refresh);
// re-render whenever the sort order changes
sortEl.addEventListener("change", refresh);

clearAllElements.addEventListener("click", () => {
  if (confirm("Delete all saved posts?")) {
    allPosts = [];
    chrome.storage.local.set({ posts: [] }, refresh);
  }
});

// Kick off the initial load when the popup opens
loadData();
