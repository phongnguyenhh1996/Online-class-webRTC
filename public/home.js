const form = document.querySelector('form');

form.addEventListener('submit', function(e) {

  const userName = form.querySelector('#userName').value;
  const className = form.querySelector('#className').value;
  const isHost = form.querySelector('[name="exampleRadios"]').value === 'host';
  if (userName && className) {
    window.location.replace(`/${className}?user=${userName}&isHost=${isHost}`);
  }
})
