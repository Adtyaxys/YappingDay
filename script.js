// =========================================================================
// 1. SISTEM ROUTING NAVIGASI UTAMA (BERDIRI MANDIRI / PALING ATAS DIJAMIN JALAN)
// =========================================================================
window.switchPage = function(pageId) {
    console.log("Navigasi berpindah ke halaman: " + pageId);
    
    const pages = document.querySelectorAll('.page');
    pages.forEach(p => {
        p.style.display = 'none';
        p.classList.remove('active');
    });
    
    const targetPage = document.getElementById(`page-${pageId}`);
    if (targetPage) {
        targetPage.style.display = 'block';
        targetPage.classList.add('active');
    }

    const navItems = document.querySelectorAll('.bottom-nav .nav-item');
    navItems.forEach(n => n.classList.remove('active'));
    
    navItems.forEach(item => {
        const clickAttr = item.getAttribute('onclick');
        if (clickAttr && clickAttr.includes(pageId)) {
            item.classList.add('active');
        }
    });

    if (pageId === 'profile') {
        if (typeof renderMyQuotes === "function") renderMyQuotes();
        if (typeof updateProfileDOM === "function") updateProfileDOM();
    }
    if (pageId === 'settings') {
        if (typeof updateProfileDOM === "function") updateProfileDOM();
    }
};

window.checkProfileAccess = function() {
    if (!currentUser) {
        showToast("Kamu perlu masuk/daftar akun dulu!");
        window.switchPage('auth');
    } else {
        window.switchPage('profile');
    }
};

window.closeModal = function() {
    document.getElementById('share-modal')?.classList.add('hidden');
};

document.addEventListener("DOMContentLoaded", () => {
    window.switchPage('home');
    console.log("Sistem Navigasi Utama Siap Berfungsi!");
});


// =========================================================================
// 2. KONEKSI KE DATABASE FIREBASE
// =========================================================================
const firebaseConfig = {
    apiKey: "AIzaSyBugO0DKmTaJ-GrYLrXNmg1w_ow6c5kouo",
    authDomain: "lennberkata-kata-76cd4.firebaseapp.com",
    databaseURL: "https://lennberkata-kata-76cd4-default-rtdb.firebaseio.com",
    projectId: "lennberkata-kata-76cd4",
    storageBucket: "lennberkata-kata-76cd4.firebasestorage.app",
    messagingSenderId: "177864830190",
    appId: "1:177864830190:web:1e948c7fce2bd1349e97ff",
    measurementId: "G-1DQDDND13C"
};

let quotes = [];
let currentUser = JSON.parse(localStorage.getItem('lenn_current_user')) || null;
let currentAuthTab = 'login';

try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const database = firebase.database();

    // Listener Realtime Ambil Data Feed Utama & komentar sekaligus
    database.ref('quotes').on('value', (snapshot) => {
        quotes = [];
        const data = snapshot.val();
        if (data) {
            Object.keys(data).forEach(key => {
                quotes.push({ id: key, ...data[key] });
            });
        }
        renderQuotes(document.getElementById('search-input')?.value || "");
    });
    
    document.addEventListener("DOMContentLoaded", () => {
        setupEventListeners(database);
        updateProfileDOM();
    });

} catch (firebaseError) {
    console.error("Firebase Gagal Dimuat.", firebaseError);
}


// =========================================================================
// 3. FUNGSI LOGIKA PERFORMA UTAMA & LOGIKA SISTEM
// =========================================================================

// Fungsi bantu convert File -> Base64 String
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        if (!file) resolve(null);
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function renderQuotes(filter = "") {
    const feed = document.getElementById('quotes-feed');
    if (!feed) return;
    feed.innerHTML = "";
    
    const filteredQuotes = quotes.filter(q => 
        (q.text && q.text.toLowerCase().includes(filter.toLowerCase())) || 
        (q.tag && q.tag.toLowerCase().includes(filter.toLowerCase())) ||
        (q.user && q.user.toLowerCase().includes(filter.toLowerCase()))
    );

    if(filteredQuotes.length === 0) {
        feed.innerHTML = `<p style="text-align:center; color:#8a8894; margin-top:20px;">Belum ada yappingan...</p>`;
        return;
    }

    filteredQuotes.reverse().forEach(q => {
        const isOwner = currentUser && currentUser.username === q.realOwner;
        const displayHandle = q.user === "Anonymous" ? "anonymous" : (q.realOwner || q.user).toLowerCase();
        const displayDisplayName = q.user === "Anonymous" ? "Anonymous" : q.user;
        const hasLiked = currentUser && q.likedBy && q.likedBy[currentUser.username] === true;
        
        // Logika Status Follow
        const isFollowing = currentUser && currentUser.following && currentUser.following[q.realOwner] === true;
        const showFollowBtn = currentUser && q.realOwner && q.realOwner !== currentUser.username && q.user !== "Anonymous";

        // Render Data Komentar Dinamis
        let commentsHtml = '';
        if (q.comments) {
            Object.keys(q.comments).forEach(cId => {
                const c = q.comments[cId];
                commentsHtml += `
                    <div style="font-size:0.85rem; margin-top:6px; border-left:2px solid #bf55ec; padding-left:8px; color:#d1d5db; text-align:left;">
                        <strong>@${c.user}</strong>: ${c.text}
                    </div>
                `;
            });
        }

        const card = document.createElement('div');
        card.className = 'glass-card quote-card';
        card.innerHTML = `
            <div class="quote-card-header" style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                <div style="display:flex; align-items:center;">
                    <img src="${q.avatar || 'https://ik.imagekit.io/Lenncy/8d6f642f1f9784c1cc2c7408d0fe4ee7.jpg'}" alt="User">
                    <div class="user-info" style="text-align:left;">
                        <div class="name">${displayDisplayName}</div>
                        <div class="handle">@${displayHandle}</div>
                    </div>
                </div>
                ${showFollowBtn ? `
                    <button onclick="window.toggleFollow('${q.realOwner}')" style="background:${isFollowing ? 'rgba(255,255,255,0.15)' : 'var(--accent-color)'}; color:#fff; border:none; padding:5px 12px; border-radius:20px; font-size:0.75rem; font-weight:600; cursor:pointer; margin-left:auto;">
                        ${isFollowing ? 'Following' : 'Follow'}
                    </button>
                ` : ''}
            </div>
            ${isOwner ? `<button class="delete-post-btn" onclick="window.deleteQuote('${q.id}')"><i class="fa-solid fa-trash-can"></i></button>` : ''}
            
            <div class="quote-text-content" style="margin-top:10px;">${q.text}</div>
            
            ${q.image ? `<div style="margin: 10px 0; border-radius:10px; overflow:hidden;"><img src="${q.image}" style="width:100%; max-height:250px; object-fit:cover;"></div>` : ''}
            ${q.audio ? `<div style="margin: 10px 0;"><audio src="${q.audio}" controls style="width:100%; height:32px;"></audio></div>` : ''}
            
            ${q.tag ? `<div class="quote-hashtag">${q.tag}</div>` : ''}

            <div class="quote-actions">
                <div class="action-item ${hasLiked ? 'liked' : ''}" onclick="window.likeQuote('${q.id}')">
                    <i class="${hasLiked ? 'fa-solid fa-heart' : 'fa-regular fa-heart'}"></i> <span>${q.likes || 0}</span>
                </div>
                <div class="action-item" onclick="window.openShareModal('${q.text.replace(/'/g, "\\'").replace(/"/g, '\\"')}', '${displayDisplayName}', '${q.avatar}')">
                    <i class="fa-solid fa-share-nodes"></i> <span>Share</span>
                </div>
            </div>

            <div style="margin-top:15px; border-top:1px solid var(--glass-border); padding-top:10px;">
                <div style="max-height:120px; overflow-y:auto; margin-bottom:10px;">
                    ${commentsHtml}
                </div>
                <div style="display:flex; gap:8px;">
                    <input type="text" id="input-comment-${q.id}" placeholder="Tulis komentar yappingan..." style="flex:1; background:rgba(0,0,0,0.3); border:1px solid var(--glass-border); color:#fff; padding:8px 12px; border-radius:8px; font-size:0.85rem; outline:none;">
                    <button onclick="window.addComment('${q.id}')" style="background:var(--accent-color); border:none; color:#fff; padding:0 15px; border-radius:8px; font-size:0.85rem; cursor:pointer; font-weight:600;">Kirim</button>
                </div>
            </div>
        `;
        feed.appendChild(card);
    });
}

function renderMyQuotes() {
    const myFeed = document.getElementById('my-quotes-feed');
    if (!myFeed) return;
    myFeed.innerHTML = "";
    if(!currentUser) return;

    const myQuotes = quotes.filter(q => q.realOwner === currentUser.username);
    if(myQuotes.length === 0) {
        myFeed.innerHTML = `<p style="text-align:center; color:#8a8894;">Kamu belum pernah posting kata-kata.</p>`;
        return;
    }

    myQuotes.reverse().forEach(q => {
        const card = document.createElement('div');
        card.className = 'glass-card quote-card';
        card.innerHTML = `
            <div class="quote-text-content">${q.text}</div>
            ${q.image ? `<div style="margin:5px 0; border-radius:6px; overflow:hidden;"><img src="${q.image}" style="width:100%; max-height:120px; object-fit:cover;"></div>` : ''}
            <button class="delete-post-btn" onclick="window.deleteQuote('${q.id}')"><i class="fa-solid fa-trash-can"></i></button>
        `;
        myFeed.appendChild(card);
    });
}

// Handler Fitur Aksi Interaksi Tambahan
window.addComment = function(quoteId) {
    if (!currentUser) { showToast("Login dulu untuk kirim komentar!"); return; }
    const input = document.getElementById(`input-comment-${quoteId}`);
    const commentText = input?.value.trim();
    if (!commentText) return;

    firebase.database().ref(`quotes/${quoteId}/comments`).push({
        user: currentUser.username,
        text: commentText,
        timestamp: Date.now()
    }).then(() => {
        if(input) input.value = "";
    });
};

window.toggleFollow = function(targetUser) {
    if (!currentUser) { showToast("Login dulu untuk mem-follow!"); return; }
    const database = firebase.database();
    
    if (!currentUser.following) currentUser.following = {};
    const isFollowing = currentUser.following[targetUser] === true;

    if (isFollowing) {
        delete currentUser.following[targetUser];
    } else {
        currentUser.following[targetUser] = true;
    }

    localStorage.setItem('lenn_current_user', JSON.stringify(currentUser));
    database.ref(`users/${currentUser.username}/following`).set(currentUser.following).then(() => {
        renderQuotes(document.getElementById('search-input')?.value || "");
        showToast(isFollowing ? `Unfollowed @${targetUser}` : `Mengikuti @${targetUser}`);
    });
};


function setupEventListeners(database) {
    document.getElementById('search-input')?.addEventListener('input', (e) => renderQuotes(e.target.value));

    // Submit Kirim Postingan Baru (Mendukung Konversi Media Gambar + Audio)
    document.getElementById('upload-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if(!currentUser) { showToast("Harus login dulu bro!"); window.switchPage('auth'); return; }

        const text = document.getElementById('quote-text').value;
        const tag = document.getElementById('quote-tag').value;
        const isAnonymous = document.getElementById('anonymous-toggle')?.checked || false;

        const imgFile = document.getElementById('quote-image')?.files[0];
        const audioFile = document.getElementById('quote-audio')?.files[0];

        showToast("Sedang memproses postingan...");

        try {
            const imgBase64 = imgFile ? await fileToBase64(imgFile) : null;
            const audioBase64 = audioFile ? await fileToBase64(audioFile) : null;

            database.ref('quotes').push({
                text: text, tag: tag,
                user: isAnonymous ? "Anonymous" : (currentUser.displayName || currentUser.username),
                realOwner: currentUser.username, 
                avatar: isAnonymous ? "https://ik.imagekit.io/Lenncy/8d6f642f1f9784c1cc2c7408d0fe4ee7.jpg" : (currentUser.avatar || "https://ik.imagekit.io/Lenncy/8d6f642f1f9784c1cc2c7408d0fe4ee7.jpg"),
                image: imgBase64,
                audio: audioBase64,
                likes: 0, timestamp: Date.now()
            }).then(() => {
                document.getElementById('upload-form').reset();
                showToast("Yappingan ter-publish!");
                window.switchPage('home'); 
            });
        } catch (mediaErr) {
            showToast("Gagal memproses unggahan file.");
            console.error(mediaErr);
        }
    });

    // Login & Register Akun
    document.getElementById('auth-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('auth-username').value.trim();
        const pass = document.getElementById('auth-password').value;

        if (currentAuthTab === 'login') {
            database.ref('users/' + user).once('value').then((snapshot) => {
                const userData = snapshot.val();
                if(userData && userData.password === pass) {
                    currentUser = { 
                        username: user, 
                        displayName: userData.name || user, 
                        bio: userData.bio || "Member LennBerkata", 
                        avatar: userData.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
                        following: userData.following || {}
                    };
                    localStorage.setItem('lenn_current_user', JSON.stringify(currentUser));
                    updateProfileDOM();
                    showToast(`Selamat datang @${user}!`);
                    window.switchPage('home');
                } else {
                    showToast("Username atau Password salah!");
                }
            });
        } else {
            database.ref('users/' + user).once('value').then((snapshot) => {
                if(snapshot.exists()) {
                    showToast("Username sudah digunakan orang lain!");
                } else {
                    const newUserData = { password: pass, name: user, bio: "Member baru LennBerkata", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150", following: {} };
                    database.ref('users/' + user).set(newUserData).then(() => {
                        currentUser = { username: user, displayName: user, bio: newUserData.bio, avatar: newUserData.avatar, following: {} };
                        localStorage.setItem('lenn_current_user', JSON.stringify(currentUser));
                        updateProfileDOM();
                        showToast(`Akun @${user} sukses terdaftar!`);
                        window.switchPage('home');
                    });
                }
            });
        }
    });
}

window.toggleAuthTab = function(tab) {
    currentAuthTab = tab;
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    if(tab === 'login') {
        document.getElementById('tab-login')?.classList.add('active');
        document.getElementById('auth-btn').innerText = "Masuk";
    } else {
        document.getElementById('tab-register')?.classList.add('active');
        document.getElementById('auth-btn').innerText = "Daftar Akun";
    }
};

function updateProfileDOM() {
    if(currentUser) {
        if(document.getElementById('profile-name')) document.getElementById('profile-name').innerText = currentUser.displayName || currentUser.username;
        if(document.getElementById('profile-bio')) document.getElementById('profile-bio').innerText = currentUser.bio;
        if(document.getElementById('profile-avatar')) document.getElementById('profile-avatar').src = currentUser.avatar;
        if(document.getElementById('edit-username')) document.getElementById('edit-username').value = currentUser.displayName || currentUser.username;
        if(document.getElementById('edit-bio')) document.getElementById('edit-bio').value = currentUser.bio;
    }
}

window.saveProfile = function() {
    if(!currentUser) return;
    const database = firebase.database();
    const newName = document.getElementById('edit-username').value.trim();
    const newBio = document.getElementById('edit-bio').value.trim();
    const avatarInput = document.getElementById('edit-avatar-input');

    currentUser.displayName = newName;
    currentUser.bio = newBio;

    if(avatarInput && avatarInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            currentUser.avatar = e.target.result;
            database.ref('users/' + currentUser.username).update({ name: newName, bio: newBio, avatar: currentUser.avatar }).then(() => {
                localStorage.setItem('lenn_current_user', JSON.stringify(currentUser));
                updateProfileDOM(); showToast("Profil diperbarui!"); window.switchPage('profile');
            });
        }
        reader.readAsDataURL(avatarInput.files[0]);
    } else {
        database.ref('users/' + currentUser.username).update({ name: newName, bio: newBio }).then(() => {
            localStorage.setItem('lenn_current_user', JSON.stringify(currentUser));
            updateProfileDOM(); showToast("Profil disimpan!"); window.switchPage('profile');
        });
    }
};

window.logoutUser = function() {
    localStorage.removeItem('lenn_current_user');
    currentUser = null;
    showToast("Berhasil Keluar Akun.");
    window.switchPage('home');
};

window.likeQuote = function(id) {
    if (!currentUser) { showToast("Silakan login untuk menyukai!"); return; }
    const database = firebase.database();
    const postRef = database.ref('quotes/' + id);
    postRef.once('value').then((snapshot) => {
        const post = snapshot.val();
        if (!post) return;
        let likedBy = post.likedBy || {};
        let currentLikes = post.likes || 0;

        if (likedBy[currentUser.username] === true) {
            delete likedBy[currentUser.username];
            currentLikes = Math.max(0, currentLikes - 1);
        } else {
            likedBy[currentUser.username] = true;
            currentLikes += 1;
        }
        postRef.update({ likes: currentLikes, likedBy: likedBy });
    });
};

let quoteIdToDelete = null;

window.deleteQuote = function(id) {
    quoteIdToDelete = id;
    document.getElementById('delete-modal')?.classList.remove('hidden');
};

window.closeDeleteModal = function() {
    quoteIdToDelete = null;
    document.getElementById('delete-modal')?.classList.add('hidden');
};

// Pasang event listener untuk tombol konfirmasi hapus di dalam modal
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('confirm-delete-btn')?.addEventListener('click', () => {
        if (quoteIdToDelete) {
            firebase.database().ref('quotes/' + quoteIdToDelete).remove().then(() => {
                showToast("Postingan berhasil lenyap!");
                window.closeDeleteModal();
            }).catch((err) => {
                showToast("Gagal menghapus postingan.");
                console.error(err);
            });
        }
    });
});


window.openShareModal = function(text, user, avatar) {
    if(document.getElementById('ig-text')) document.getElementById('ig-text').innerText = `"${text}"`;
    if(document.getElementById('ig-user')) document.getElementById('ig-user').innerText = `@${user.toLowerCase()}`;
    if(document.getElementById('ig-avatar')) document.getElementById('ig-avatar').src = avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150";
    document.getElementById('share-modal')?.classList.remove('hidden');
};

window.downloadAsImage = function() {
    const container = document.getElementById('instagram-card-preview');
    if(!container) return;
    html2canvas(container, { useCORS: true, allowTaint: true }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Yapping-${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
        window.closeModal();
    }).catch(() => showToast("Gagal memproses gambar."));
};

window.showQOTD = function() {
    const modal = document.getElementById('qotd-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
};

window.closeQOTD = function() {
    const modal = document.getElementById('qotd-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
};


function showToast(msg) {
    const toast = document.getElementById('toast-notif');
    if (toast) {
        toast.innerText = msg;
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 2500);
    }
}
