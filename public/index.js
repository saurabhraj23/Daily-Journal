const form = document.getElementById("contact-form");
const formEvent = form.addEventListener("submit", (event) => {
event.preventDefault();
let mail = new FormData(form);
sendMail(mail);
form.reset()
})

const sendMail = (mail) => {
fetch("/contact", {
  method: "post",
  body: mail,
}).then((response) => {
  return response.json();
});
};
