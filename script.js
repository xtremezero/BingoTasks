const APP_VERSION = 'v1.1';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const lastVersion = localStorage.getItem('appVersion');
    if (lastVersion && lastVersion !== APP_VERSION) {
      console.log("New version detected, updating...");
      caches.keys().then(function (names) {
        for (let name of names) caches.delete(name);
      });
      setTimeout(() => window.location.reload(true), 500);
    }

    navigator.serviceWorker.register('service-worker.js')
      .then((registration) => {
        console.log("Service Worker Registered");
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New content available, reloading...');
              window.location.reload(true);
            }
          });
        });
      })
      .catch((err) => console.error("SW Registration Failed", err));

    localStorage.setItem('appVersion', APP_VERSION);
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('Controller changed, reloading...');
    window.location.reload(true);
  });
}

const table = document.getElementById('cardTable');
const savedCards = JSON.parse(localStorage.getItem('cardData') || '{}');
const savedHeaders = JSON.parse(localStorage.getItem('headersData') || '{}');

const ROWS = 5;
const COLS = 5;

const rowHeaders = [];
const colHeaders = [];

function addHoldListener(element, onHold, onClick) {
  let timer, isHolding = false;

  const start = (e) => {
    e.preventDefault();
    isHolding = false;
    timer = setTimeout(() => {
      isHolding = true;
      onHold(e);
    }, 400);
  };

  const end = (e) => {
    clearTimeout(timer);
    if (!isHolding) {
      onClick(e);
    }
  };

  element.addEventListener('mousedown', start);
  element.addEventListener('touchstart', start);

  element.addEventListener('mouseup', end);
  element.addEventListener('touchend', end);

  element.addEventListener('mouseleave', () => clearTimeout(timer));
  element.addEventListener('touchcancel', () => clearTimeout(timer));

  element.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    onHold(e);
  });
}

function flipCard(card, id) {
  card.classList.toggle('flipped');
  const isFlipped = card.classList.contains('flipped');

  savedCards[id] = savedCards[id] || {};
  savedCards[id].flipped = isFlipped;

  const front = card.querySelector('.card-front');
  const back = card.querySelector('.card-back');
  const currentDate = getCurrentDateFormatted();

  // Store and update text and date
  savedCards[id].text = savedCards[id].text || front.textContent;
  savedCards[id].date = currentDate;

  // Always update back side content to reflect current date
  back.innerHTML = `${savedCards[id].text}<div class="date">${currentDate}</div>`;

  localStorage.setItem('cardData', JSON.stringify(savedCards));
  updateHeaderHighlights();
}

function getCurrentDateFormatted() {
  const now = new Date();
  const day = now.getDate();
  const month = now.toLocaleString('default', { month: 'long' });
  return `${day} ${month}`;
}

function makeEditableHeader(content, type, index) {
  const th = document.createElement('th');
  const key = `${type}-${index}`;
  th.textContent = savedHeaders[key] || content;
  th.dataset.key = key;

  addHoldListener(th, () => {
    const newHeader = prompt(`Enter new name for ${type} ${index + 1}:`, th.textContent);
    if (newHeader && newHeader.trim()) {
      th.textContent = newHeader;
      savedHeaders[key] = newHeader;
      localStorage.setItem('headersData', JSON.stringify(savedHeaders));
    }
  }, () => {});

  if (type === 'row') rowHeaders[index] = th;
  else colHeaders[index] = th;

  return th;
}

function updateHeaderHighlights() {
  for (let r = 0; r < ROWS; r++) {
    let allFlipped = true;
    for (let c = 0; c < COLS; c++) {
      const id = `${r}-${c}`;
      if (!savedCards[id]?.flipped) {
        allFlipped = false;
        break;
      }
    }
    rowHeaders[r].style.backgroundColor = allFlipped ? '#81C784' : '#dfe6ed';
  }

  for (let c = 0; c < COLS; c++) {
    let allFlipped = true;
    for (let r = 0; r < ROWS; r++) {
      const id = `${r}-${c}`;
      if (!savedCards[id]?.flipped) {
        allFlipped = false;
        break;
      }
    }
    colHeaders[c].style.backgroundColor = allFlipped ? '#81C784' : '#dfe6ed';
  }
}

function exportData() {
  const data = {
    cards: savedCards,
    headers: savedHeaders
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'card-grid-data.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

document.getElementById('importFile').addEventListener('change', function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);
      if (data.cards && data.headers) {
        localStorage.setItem('cardData', JSON.stringify(data.cards));
        localStorage.setItem('headersData', JSON.stringify(data.headers));
        location.reload();
      } else {
        alert("Invalid file format.");
      }
    } catch (err) {
      alert("Failed to load file: " + err.message);
    }
  };
  reader.readAsText(file);
});

const headerRow = document.createElement('tr');
headerRow.appendChild(document.createElement('th'));

for (let col = 0; col < COLS; col++) {
  headerRow.appendChild(makeEditableHeader('Not Assigned', 'col', col));
}
table.appendChild(headerRow);

for (let row = 0; row < ROWS; row++) {
  const tr = document.createElement('tr');
  tr.appendChild(makeEditableHeader('Not Assigned', 'row', row));

  for (let col = 0; col < COLS; col++) {
    const id = `${row}-${col}`;
    const td = document.createElement('td');
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = id;

    const inner = document.createElement('div');
    inner.className = 'card-inner';

    const front = document.createElement('div');
    front.className = 'card-front';
    front.textContent = savedCards[id]?.text || 'Not Assigned';

    const back = document.createElement('div');
    back.className = 'card-back';
    back.innerHTML = savedCards[id]
      ? `${savedCards[id].text}<div class="date">${savedCards[id].date}</div>`
      : 'Completed!';

    inner.appendChild(front);
    inner.appendChild(back);
    card.appendChild(inner);

    if (savedCards[id]?.flipped) {
      card.classList.add('flipped');
    }

    addHoldListener(
      card,
      () => {
        const currentText = savedCards[id]?.text || front.textContent;
        const newText = prompt('Enter new text for this card:', currentText);
        if (newText && newText.trim()) {
          const currentDate = getCurrentDateFormatted();
          front.textContent = newText;
          back.innerHTML = `${newText}<div class="date">${currentDate}</div>`;
          savedCards[id] = {
            text: newText,
            date: currentDate,
            flipped: card.classList.contains('flipped')
          };
          localStorage.setItem('cardData', JSON.stringify(savedCards));
        }
      },
      () => flipCard(card, id)
    );

    td.appendChild(card);
    tr.appendChild(td);
  }

  table.appendChild(tr);
}

updateHeaderHighlights();
