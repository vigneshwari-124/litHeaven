// ❤️ wishlist count
async function loadWishlistCount() {
  try {
    const res = await fetch("/wishlist-data")
    const data = await res.json()

    const badge = document.getElementById("wishlistBadge")
    if (!badge) return

    if (data.totalItems > 0) {
      badge.style.display = "flex"
      badge.textContent = data.totalItems
    } else {
      badge.style.display = "none"
    }
  } catch (err) {
    console.log(err)
  }
}

// 🛒 cart count
async function loadCartCount() {
  try {
    const res = await fetch("/get-cart")
    const data = await res.json()

    const badge = document.getElementById("cartBadge")
    if (!badge) return

    const count = data.items?.length || 0

    if (count > 0) {
      badge.style.display = "flex"
      badge.textContent = count
    } else {
      badge.style.display = "none"
    }
  } catch (err) {
    console.log(err)
  }
}

// 🔥 AUTO RUN (ALL PAGES)
window.addEventListener("DOMContentLoaded", () => {
  loadWishlistCount()
  loadCartCount()
})