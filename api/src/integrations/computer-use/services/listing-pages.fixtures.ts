export const BASIC_LISTING_HTML = `
<!doctype html>
<html>
  <body>
    <p>Browse our full catalog of items below and use Next to see more results.</p>
    <div class="catalog-grid">
      <div class="catalog-card">
        <a class="card-link" href="/items/1"><h3 class="card-title">Widget Alpha</h3></a>
        <span class="card-price">$19.99</span>
      </div>
      <div class="catalog-card">
        <a class="card-link" href="/items/2"><h3 class="card-title">Widget Beta</h3></a>
        <span class="card-price">$24.99</span>
      </div>
      <div class="catalog-card">
        <a class="card-link" href="/items/3"><h3 class="card-title">Widget Gamma</h3></a>
        <span class="card-price">$29.99</span>
      </div>
    </div>
    <a class="next-page-btn" href="/catalog?page=2">Next</a>
  </body>
</html>
`;

export const MISSING_FIELD_ON_LATER_CARD_HTML = `
<!doctype html>
<html>
  <body>
    <p>Browse our full catalog of items below and use Next to see more results.</p>
    <div class="catalog-grid">
      <div class="catalog-card">
        <a class="card-link" href="/items/1"><h3 class="card-title">Widget Alpha</h3></a>
        <span class="card-price">$19.99</span>
      </div>
      <div class="catalog-card">
        <a class="card-link" href="/items/2"><h3 class="card-title">Widget Beta</h3></a>
        <span class="card-price">$24.99</span>
      </div>
      <div class="catalog-card">
        <a class="card-link" href="/items/3"><h3 class="card-title">Widget Gamma</h3></a>
        <!-- card 3 (index 2) intentionally has no .card-price node -->
      </div>
    </div>
  </body>
</html>
`;

export const DATA_URI_IMAGE_HTML = `
<!doctype html>
<html>
  <body>
    <p>Browse our full catalog of items below and use Next to see more results.</p>
    <div class="catalog-grid">
      <div class="catalog-card">
        <a class="card-link" href="/items/1"><h3 class="card-title">Widget Alpha</h3></a>
        <span class="card-price">$19.99</span>
        <img class="card-thumb" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" data-src="https://example.com/images/widget-alpha.jpg" />
      </div>
    </div>
  </body>
</html>
`;

export const INFINITE_SCROLL_HTML = `
<!doctype html>
<html>
  <body>
    <p>Browse our full catalog of items below — scroll down to load more results.</p>
    <div class="catalog-grid" id="grid">
      <div class="catalog-card"><h3 class="card-title">Widget Alpha</h3><span class="card-price">$19.99</span></div>
      <div class="catalog-card"><h3 class="card-title">Widget Beta</h3><span class="card-price">$24.99</span></div>
    </div>
    <div style="height: 2000px;"></div>
    <script>
      window.addEventListener('scroll', function () {
        var grid = document.getElementById('grid');
        if (grid.children.length < 4) {
          var card = document.createElement('div');
          card.className = 'catalog-card';
          card.innerHTML = '<h3 class="card-title">Widget Extra</h3><span class="card-price">$9.99</span>';
          grid.appendChild(card);
        }
      });
    </script>
  </body>
</html>
`;

export const STATIC_LISTING_NO_GROWTH_HTML = `
<!doctype html>
<html>
  <body>
    <p>Browse our full catalog of items below — this is a single, static page.</p>
    <div class="catalog-grid" id="grid">
      <div class="catalog-card"><h3 class="card-title">Widget Alpha</h3><span class="card-price">$19.99</span></div>
      <div class="catalog-card"><h3 class="card-title">Widget Beta</h3><span class="card-price">$24.99</span></div>
    </div>
    <div style="height: 2000px;"></div>
  </body>
</html>
`;

export const LOAD_MORE_HTML = `
<!doctype html>
<html>
  <body>
    <p>Browse our full catalog of items below and click Load more to see more results.</p>
    <div class="catalog-grid" id="grid">
      <div class="catalog-card"><h3 class="card-title">Widget Alpha</h3><span class="card-price">$19.99</span></div>
      <div class="catalog-card"><h3 class="card-title">Widget Beta</h3><span class="card-price">$24.99</span></div>
    </div>
    <button class="load-more-btn">Load more</button>
    <script>
      document.querySelector('.load-more-btn').addEventListener('click', function () {
        var grid = document.getElementById('grid');
        var card = document.createElement('div');
        card.className = 'catalog-card';
        card.innerHTML = '<h3 class="card-title">Widget Extra</h3><span class="card-price">$9.99</span>';
        grid.appendChild(card);
      });
    </script>
  </body>
</html>
`;

export const NEXT_BUTTON_HTML = `
<!doctype html>
<html>
  <body>
    <p>Browse our full catalog of items below and use Next to see more results.</p>
    <div class="catalog-grid" id="grid">
      <div class="catalog-card"><a class="card-link" href="/items/1"><h3 class="card-title">Widget Alpha</h3></a><span class="card-price">$19.99</span></div>
      <div class="catalog-card"><a class="card-link" href="/items/2"><h3 class="card-title">Widget Beta</h3></a><span class="card-price">$24.99</span></div>
    </div>
    <a class="next-page-btn" href="/catalog?page=2">Next</a>
    <script>
      document.querySelector('.next-page-btn').addEventListener('click', function (e) {
        e.preventDefault();
        document.getElementById('grid').innerHTML =
          '<div class="catalog-card"><a class="card-link" href="/items/11"><h3 class="card-title">Widget Alpha Page 2</h3></a><span class="card-price">$99.99</span></div>';
      });
    </script>
  </body>
</html>
`;

export const DETAIL_PAGE_HTML = `
<!doctype html>
<html>
  <head><title>Widget Alpha</title></head>
  <body>
    <header><nav>Home / Catalog / Widget Alpha</nav></header>
    <main>
      <h1 class="item-title">Widget Alpha</h1>
      <div class="item-gallery">
        <img class="gallery-image" src="https://example.com/images/widget-alpha-1.jpg" alt="Widget Alpha" />
        <img class="gallery-image" src="https://example.com/images/widget-alpha-2.jpg" alt="Widget Alpha side view" />
      </div>
      <p class="item-description">
        Widget Alpha is a premium widget built for durability and performance. It ships with a
        two-year warranty and is compatible with all standard widget mounts on the market today.
      </p>
      <dl class="item-specs">
        <dt>Weight</dt><dd>1.2kg</dd>
        <dt>Material</dt><dd>Aluminum</dd>
        <dt>Color</dt><dd>Silver</dd>
      </dl>
      <ul class="item-features">
        <li>Waterproof</li>
        <li>Shockproof</li>
        <li>Rechargeable</li>
      </ul>
    </main>
    <footer>© Example Catalog</footer>
  </body>
</html>
`;
