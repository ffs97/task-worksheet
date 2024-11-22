var hour, minute;

function setClock() {
    var currentTime = new Date();

    const H = currentTime.getHours()
    const M = currentTime.getMinutes()
    hour.text((H < 10 ? "0" : "") + H);
    minute.text((M < 10 ? "0" : "") + M);
}

$(document).ready(function () {
    hour = $("#clock-hour");
    minute = $("#clock-minute");

    setClock();
    setInterval(setClock, 30000);
});