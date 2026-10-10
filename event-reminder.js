(function () {
  const dialog = document.querySelector('#eventReminder');
  if (!dialog || typeof dialog.showModal !== 'function') return;

  const storageKey = 'patio_event_seen_nightmare_2026';
  const eventEndsAt = Date.parse('2026-10-29T01:00:00-04:00');
  // This reminder belongs to this event, so it expires even on returning visits.
  if (Date.now() >= eventEndsAt) return;
  try {
    if (localStorage.getItem(storageKey)) return;
  } catch {
    // The reminder remains usable when browser storage is disabled.
  }

  const previousFocus = document.activeElement;
  dialog.addEventListener('close', () => {
    document.body.classList.remove('event-reminder-open');
    if (previousFocus instanceof HTMLElement) previousFocus.focus();
  });
  dialog.querySelectorAll('[data-dismiss-event]').forEach(control => {
    control.addEventListener('click', () => dialog.close());
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right ||
        event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.showModal();
  document.body.classList.add('event-reminder-open');
  try {
    localStorage.setItem(storageKey, '1');
  } catch {}
})();
