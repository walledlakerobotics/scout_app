const headerDiv = document.getElementById('header');
const template = document.createElement('template');

template.innerHTML = "<a href='#index'><h1>Scout App</h1></a>";

headerDiv.appendChild(template.content);

const footerDiv = document.getElementById('header');

template.innerHTML = "<p>© Copyright 2025 Walled Lake Robotics</p>";
footerDiv.appendChild(template.content);