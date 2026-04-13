const API_URL = "https://newsapi.org/v2/top-headlines";
const FALLBACK_IMAGE =
	"https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80";
const FALLBACK_DESCRIPTION = "Click to read full news.";

const newsGrid = document.getElementById("bento-gallery");
const navLinks = document.querySelectorAll(".nav-items a");

function escapeText(text) {
	return (text || "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/\"/g, "&quot;")
		.trim();
}

function getTileShape(index) {
	if (index % 6 === 0) return "tile--large";
	if (index % 3 === 0) return "tile--medium";
	return "tile--small";
}

function createSkeletonCards(totalCards = 8) {
	const html = [];

	for (let i = 0; i < totalCards; i += 1) {
		html.push(`
			<article class="bento-tile ${getTileShape(i)} skeleton-tile" aria-hidden="true">
				<div class="skeleton-image-block"></div>
				<div class="skeleton-caption-block">
					<div class="skeleton-line"></div>
					<div class="skeleton-line"></div>
					<div class="skeleton-line short"></div>
				</div>
			</article>
		`);
	}

	return html.join("");
}

function createNewsCard(article, index) {
	const title = escapeText(article.title) || "Untitled news";
	const description = escapeText(article.description) || FALLBACK_DESCRIPTION;
	const image = article.urlToImage || FALLBACK_IMAGE;
	const url = article.url || "#";

	return `
		<article class="bento-tile ${getTileShape(index)} reveal-tile" style="animation-delay:${index * 70}ms">
			<a class="bento-tile-link" href="${url}" target="_blank" rel="noopener noreferrer">
				<img src="${image}" alt="${title}" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'" />
				<div class="tile-caption">
					<strong>${title}</strong>
					<span>${description}</span>
				</div>
			</a>
		</article>
	`;
}

function renderNews(articles) {
	if (!articles || articles.length === 0) {
		newsGrid.innerHTML = '<div class="empty-state">No news found.</div>';
		return;
	}

	const cards = articles.map((article, index) => createNewsCard(article, index));
	newsGrid.innerHTML = cards.join("");
}

async function loadNews(category) {
	const apiKey = window.NEWS_API_KEY;
	if (!apiKey) {
		newsGrid.innerHTML = '<div class="empty-state">API key not found in config.js</div>';
		return;
	}

	newsGrid.innerHTML = createSkeletonCards(8);

	const query = new URLSearchParams({
		country: "us",
		pageSize: "12",
		apiKey,
	});

	if (category !== "home") {
		query.set("category", category);
	}

	try {
		const response = await fetch(`${API_URL}?${query.toString()}`);
		if (!response.ok) {
			throw new Error(`Failed with status ${response.status}`);
		}

		const data = await response.json();
		renderNews(data.articles || []);
	} catch (error) {
		newsGrid.innerHTML = '<div class="empty-state">Unable to load news right now.</div>';
	}
}

function setActiveNav(clickedLink) {
	navLinks.forEach((link) => {
		const isActive = link === clickedLink;
		link.classList.toggle("active", isActive);
	});
}

navLinks.forEach((link) => {
	link.addEventListener("click", (event) => {
		event.preventDefault();
		const category = link.dataset.category || "home";
		setActiveNav(link);
		loadNews(category);
	});
});

const defaultLink = document.querySelector('.nav-items a[data-category="home"]');
if (defaultLink) {
	setActiveNav(defaultLink);
}

loadNews("home");
