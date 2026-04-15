/**
 * Test suite for newsManager module
 */

describe('newsManager', function() {
    it('should have fetchNews function', function() {
        if (!window.newsManager || typeof window.newsManager.fetchNews !== 'function') {
            throw new Error('fetchNews function not available');
        }
    });

    it('should return a promise', function() {
        var result = window.newsManager.fetchNews('home', 12, 'us', {});
        if (!(result instanceof Promise)) {
            throw new Error('fetchNews should return a Promise');
        }
    });

    it('should handle category parameter', function() {
        var categories = ['home', 'business', 'technology', 'sports'];
        categories.forEach(function(cat) {
            var result = window.newsManager.fetchNews(cat, 12, 'us', {});
            if (!(result instanceof Promise)) {
                throw new Error('fetchNews should return a Promise for category: ' + cat);
            }
        });
    });
});

describe('renderBentoGallery', function() {
    it('should render articles as tiles', function() {
        var mockArticles = [
            {
                title: 'Test Article',
                url: 'https://example.com/article',
                urlToImage: 'https://example.com/image.jpg',
                source: { name: 'Test Source' },
                description: 'Test description'
            }
        ];
        
        var container = document.createElement('div');
        renderBentoGallery(mockArticles, container, 'home');
        
        if (container.children.length === 0) {
            throw new Error('Articles should be rendered as tiles');
        }
    });

    it('should handle empty articles array', function() {
        var container = document.createElement('div');
        renderBentoGallery([], container, 'home');
        
        if (container.textContent.indexOf('No articles') === -1) {
            throw new Error('Should show "No articles" message for empty array');
        }
    });
});
