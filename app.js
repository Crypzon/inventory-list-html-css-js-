document.addEventListener('DOMContentLoaded', () => {
    // === Referensi Elemen HTML ===
    const addItemBtn = document.getElementById('addItemBtn');
    const inventoryListDiv = document.getElementById('inventoryList');
    const searchInput = document.getElementById('searchInput');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const printSelectedBtn = document.getElementById('printSelectedBtn');
    
    const inputs = {
        name: document.getElementById('itemName'),
        quantity: document.getElementById('itemQuantity'),
        status: document.getElementById('itemStatus'),
        owner: document.getElementById('itemOwner'),
        purchaseDate: document.getElementById('itemPurchaseDate')
    };

    const itemDetailModal = document.getElementById('item-detail-modal');
    const modalCloseBtn = document.querySelector('.modal-close');
    const modalBody = document.getElementById('modal-body');
    
    const qrcodeDiv = document.getElementById('qrcode');
    const qrcodeGenerator = new QRCode(qrcodeDiv, { width: 128, height: 128 });
    
    // === Variabel State Aplikasi ===
    let inventory = JSON.parse(localStorage.getItem('inventory')) || [];
    let selectedItems = new Set();

    // === Fungsi Render Utama dengan Logika Pencarian dan Checkbox ===
    const renderInventory = () => {
        const searchTerm = searchInput.value.toLowerCase();
        
        const filteredInventory = inventory.filter(item => 
            item.name.toLowerCase().includes(searchTerm) ||
            (item.owner && item.owner.toLowerCase().includes(searchTerm))
        );

        inventoryListDiv.innerHTML = '';
        if (filteredInventory.length === 0) {
            inventoryListDiv.innerHTML = '<p>Item tidak ditemukan.</p>';
            updateBulkActionsUI(); // Update UI bahkan jika kosong
            return;
        }
        
        filteredInventory.forEach(item => {
            const isChecked = selectedItems.has(item.id);
            const itemDiv = document.createElement('div');
            itemDiv.className = 'item';
            itemDiv.dataset.itemId = item.id;
            
            itemDiv.innerHTML = `
                <input type="checkbox" class="item-checkbox" data-id="${item.id}" ${isChecked ? 'checked' : ''}>
                <div class="item-info">
                    <span><strong>${item.name}</strong> (Status: ${item.status})</span>
                    <span>Jumlah: ${item.quantity}</span>
                </div>
            `;
            inventoryListDiv.appendChild(itemDiv);
        });
        updateBulkActionsUI();
    };

    // === Fungsi Aksi Massal ===
    const updateBulkActionsUI = () => {
        const selectedCount = selectedItems.size;
        printSelectedBtn.disabled = selectedCount === 0;
        printSelectedBtn.textContent = `Cetak Terpilih (${selectedCount})`;
        
        const allVisibleCheckboxes = document.querySelectorAll('.item-checkbox');
        selectAllCheckbox.checked = allVisibleCheckboxes.length > 0 && selectedCount === allVisibleCheckboxes.length;
    };
    
    const handleBulkPrint = () => {
        const itemsToPrint = inventory.filter(item => selectedItems.has(item.id));
        if (itemsToPrint.length === 0) {
            alert("Pilih minimal satu item untuk dicetak.");
            return;
        }
        // ... (Logika print yang sudah ada sebelumnya)
        let allStickersHTML = '';
        itemsToPrint.forEach(item => {
            allStickersHTML += `<div class="sticker-container"><div class="sticker-content"><div class="sticker-qr" id="qr-${item.id}"></div><div class="sticker-details"><div class="item-name">${item.name}</div><div class="item-owner">Pemilik: ${item.owner || 'N/A'}</div><div class="item-id">ID: ${item.id}</div></div></div><div class="sticker-footer">Dicetak: ${new Date().toLocaleDateString('id-ID')}</div></div>`;
        });
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`<html><head><title>Cetak Stiker</title><link rel="stylesheet" href="print-style.css"><script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"><\/script></head><body><div class="print-page">${allStickersHTML}</div></body></html>`);
        printWindow.document.close();
        printWindow.onload = () => {
            itemsToPrint.forEach(item => { new QRCode(printWindow.document.getElementById(`qr-${item.id}`), { text: item.id, width: 151, height: 151 }); });
            setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
        };
    };

    // === Event Listeners ===
    addItemBtn.addEventListener('click', () => {
        const newItem = {
            id: Date.now().toString(),
            name: inputs.name.value.trim(),
            quantity: parseInt(inputs.quantity.value),
            status: inputs.status.value,
            owner: inputs.owner.value.trim(),
            purchaseDate: inputs.purchaseDate.value
        };

        if (newItem.name && !isNaN(newItem.quantity) && newItem.quantity > 0) {
            inventory.push(newItem);
            localStorage.setItem('inventory', JSON.stringify(inventory));
            renderInventory();
            qrcodeGenerator.clear();
            qrcodeGenerator.makeCode(newItem.id);
            Object.values(inputs).forEach(input => input.value = '');
            inputs.status.value = 'Baik';
        } else {
            alert('Harap isi nama dan jumlah barang dengan benar.');
        }
    });

    searchInput.addEventListener('input', renderInventory);

    // Event delegation untuk klik di daftar
    inventoryListDiv.addEventListener('click', (e) => {
        const itemInfo = e.target.closest('.item-info');
        if (itemInfo) {
            const itemId = itemInfo.parentElement.dataset.itemId;
            const item = inventory.find(i => i.id === itemId);
            if (item) showModal(item);
        }
    });
    
    // Event delegation untuk checkbox
    inventoryListDiv.addEventListener('change', (e) => {
        if (e.target.classList.contains('item-checkbox')) {
            const itemId = e.target.dataset.id;
            if (e.target.checked) {
                selectedItems.add(itemId);
            } else {
                selectedItems.delete(itemId);
            }
            updateBulkActionsUI();
        }
    });

    selectAllCheckbox.addEventListener('change', (e) => {
        const checkboxes = document.querySelectorAll('.item-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = e.target.checked;
            const itemId = checkbox.dataset.id;
            if (e.target.checked) selectedItems.add(itemId); else selectedItems.delete(itemId);
        });
        updateBulkActionsUI();
    });

    printSelectedBtn.addEventListener('click', handleBulkPrint);

    // === Sisa Kode (Modal & Scanner) ===
    const showModal = (item) => { /* ... (kode sama seperti sebelumnya) ... */ };
    (function attachRemainingFunctions(){
        Object.assign(window, {
            showModal: (item) => {
                const formattedDate = item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Tidak ada';
                modalBody.innerHTML = `<div id="modal-qrcode-display" class="modal-qr-container"></div><div class="modal-details-text"><p><strong>Nama Barang:</strong> ${item.name}</p><p><strong>Jumlah:</strong> ${item.quantity}</p><p><strong>Status:</strong> ${item.status || 'N/A'}</p><p><strong>Pemilik/Outlet:</strong> ${item.owner || 'N/A'}</p><p><strong>Tanggal Beli:</strong> ${formattedDate}</p><hr><p><strong>ID Unik:</strong> ${item.id}</p></div>`;
                new QRCode(modalBody.querySelector('#modal-qrcode-display'), { width: 200, height: 200 }).makeCode(item.id);
                itemDetailModal.classList.add('active');
            },
            hideModal: () => { itemDetailModal.classList.remove('active'); }
        });
        modalCloseBtn.addEventListener('click', window.hideModal);
        itemDetailModal.addEventListener('click', (e) => { if (e.target === itemDetailModal) window.hideModal(); });

        try {
            const html5QrcodeScanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
            html5QrcodeScanner.render((decodedText) => {
                const foundItem = inventory.find(item => item.id === decodedText);
                if (foundItem) window.showModal(foundItem); else alert(`Item dengan ID ${decodedText} tidak ditemukan.`);
            }, (error) => {});
        } catch (e) {
            console.error("Gagal memulai QR Scanner.", e);
        }
    })();
    
    // Render awal
    renderInventory();
});