document.addEventListener('DOMContentLoaded', () => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('serviceWorker.js');
    }

    const form = document.getElementById('form');

    form.addEventListener('submit', event => {
        event.preventDefault();

        fetch('/scouting/data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
    });
});