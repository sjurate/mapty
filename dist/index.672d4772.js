"use strict";
class Workout {
    date = new Date();
    id = (Date.now() + "").slice(-10);
    clicks = 0;
    constructor(coords, distance, duration){
        this.coords = coords; // [lat, lng]
        this.distance = distance; // in km
        this.duration = duration; // in min
    }
    _setDescription() {
        const months = [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December"
        ];
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
    }
    click() {
        this.clicks++;
    }
}
class Running extends Workout {
    type = "running";
    constructor(coords, distance, duration, cadence){
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }
    calcPace() {
        // min/km
        this.pace = this.duration / this.distance;
        return this.pace;
    }
}
class Cycling extends Workout {
    type = "cycling";
    constructor(coords, distance, duration, elevationGain){
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();
    }
    calcSpeed() {
        // km/h
        this.speed = this.distance / (this.duration / 60);
        return this.speed;
    }
}
// example:
// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 27, 95, 523);
// console.log(run1);
// console.log(cycling1);
const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");
///////////////////////////////////////////////////////
// APPLICATION ARCHITECTURE ----------------------
class App {
    #map;
    #mapEvent;
    #workouts = [];
    #mapZoom = 13;
    constructor(){
        this._getPosition();
        // GET DATA FROM LOCAL STORAGE
        this._getLocalStorage();
        // LISTENING TO EVENTS RIGHT AFTER CREATION
        form.addEventListener("submit", this._newWorkout.bind(this));
        // Changing form's input field depending on type of workout
        inputType.addEventListener("change", this._toggleElevationField.bind(this));
        containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));
    }
    _getPosition() {
        // Geolocation API
        // takes 2 callback functions: 1st - success case, 2nd - error case
        if (navigator.geolocation) navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function() {
            alert("Could not get your position");
        });
    }
    _loadMap(position) {
        const { latitude  } = position.coords;
        const { longitude  } = position.coords;
        const coords = [
            latitude,
            longitude
        ];
        this.#map = L.map("map").setView(coords, this.#mapZoom);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);
        // Creating initial marker showing current location
        L.marker(coords).addTo(this.#map).bindPopup("Hi there!").openPopup();
        // Adding already existing markers
        this.#workouts.forEach((w)=>this._renderWorkoutMarker(w));
        // Handling clicks on map
        // like an EventListener, just created specifically for map
        this.#map.on("click", this._showForm.bind(this));
    }
    _showForm(mapE) {
        this.#mapEvent = mapE;
        form.classList.remove("hidden");
        inputDistance.focus();
    //console.log(mapEvent);
    // const { lat, lng } = mapEvent.latlng;
    // L.marker([lat, lng])
    //   .addTo(map)
    //   .bindPopup(
    //     L.popup({
    //       maxWidth: 250,
    //       minWidth: 100,
    //       autoClose: false,
    //       closeOnClick: false,
    //       className: 'running-popup',
    //     })
    //   )
    //   .setPopupContent('Workout')
    //   .openPopup();
    }
    _hideForm() {
        // Clear input fields
        inputDistance.value = inputDuration.value = inputElevation.value = inputCadence.value = "";
        form.style.display = "none";
        form.classList.add("hidden");
        setTimeout(()=>form.style.display = "grid", 1000);
    }
    _toggleElevationField() {
        inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
        inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
    }
    _newWorkout(e) {
        e.preventDefault();
        // helper functions:
        const validInputs = (...inputs)=>inputs.every((inp)=>Number.isFinite(inp));
        const allPositive = (...inputs)=>inputs.every((inp)=>inp > 0);
        // Get data from a form
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const { lat , lng  } = this.#mapEvent.latlng;
        let workout;
        // If activity- running, create running obj
        if (type === "running") {
            const cadence = +inputCadence.value;
            // Check if data is valid
            if (// !Number.isFinite(distance) ||
            // !Number.isFinite(duration) ||
            // !Number.isFinite(cadence)
            !validInputs(distance, duration, cadence) || !allPositive(distance, duration, cadence)) return alert("Inputs have to be positive numbers!");
            workout = new Running([
                lat,
                lng
            ], distance, duration, cadence);
        }
        // If activity - cycling - create cycling obj
        if (type === "cycling") {
            const elevation = +inputElevation.value;
            // Check if data is valid
            if (!validInputs(distance, duration, elevation) || !allPositive(distance, duration)) return alert("Inputs have to be positive numbers!");
            workout = new Cycling([
                lat,
                lng
            ], distance, duration, elevation);
        }
        // Add new object to workout array
        this.#workouts.push(workout);
        // Render workout on map as a marker
        this._renderWorkoutMarker(workout);
        // Render workout on a list
        this._renderWorkout(workout);
        // Hide form from UI
        this._hideForm();
        // Set local storage to all workouts
        this._setLocalStorage();
    }
    _renderWorkoutMarker(workout) {
        L.marker(workout.coords).addTo(this.#map).bindPopup(L.popup({
            maxWidth: 250,
            minWidth: 100,
            autoClose: false,
            closeOnClick: false,
            className: `${workout.type}-popup`
        })).setPopupContent(`${workout.type === "running" ? "\uD83C\uDFC3‍♂️" : "\uD83D\uDEB4‍♀️"} ${workout.description}`).openPopup();
    }
    _renderWorkout(workout) {
        let html = `<li class="workout workout--${workout.type}" data-id="${workout.id}">
    <h2 class="workout__title">${workout.description}</h2>
    <div class="workout__details">
      <span class="workout__icon">${workout.type === "running" ? "\uD83C\uDFC3‍♂️" : "\uD83D\uDEB4‍♀️"}</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>
   
    `;
        if (workout.type === "running") html += `
    <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace}</span>
        <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">m</span>
    </div>
    <button class="workout_delete">❌</button>
  </li>`;
        if (workout.type === "cycling") html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">spm</span>
      </div>
      <button class="delete">❌</button>
    </li>`;
        form.insertAdjacentHTML("afterend", html);
        const deleteBtns = document.querySelectorAll(".delete");
        deleteBtns.forEach((btn)=>btn.addEventListener("click", this._deleteWorkout.bind(this)));
        console.log(deleteBtns);
    }
    _moveToPopup(e) {
        const workoutEl = e.target.closest(".workout");
        if (!workoutEl) return;
        const workout = this.#workouts.find((w)=>w.id === workoutEl.dataset.id);
        // move the map to workout place
        // setView() needs 2 arguments: 1st - coords where to move, 2nd - zoom level. 3rd is optional - object with options
        this.#map.setView(workout.coords, this.#mapZoom, {
            animate: true,
            pan: {
                duration: 1
            }
        });
    // using publis interface
    //workout.click();
    }
    _setLocalStorage() {
        localStorage.setItem("workouts", JSON.stringify(this.#workouts));
    }
    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem("workouts"));
        if (!data) return;
        this.#workouts = data;
        this.#workouts.forEach((w)=>this._renderWorkout(w));
    }
    _deleteWorkout(e) {
        const workoutEl = e.target.closest(".workout");
        console.log(workoutEl);
        const index = this.#workouts.findIndex((w)=>w.id === workoutEl.dataset.id);
        console.log(index);
        this.#workouts = this.#workouts.splice(index, 1);
        console.log(this.#workouts);
        this._setLocalStorage();
        this._getLocalStorage();
    }
    reset() {
        localStorage.removeItem("workouts");
        location.reload();
    }
}
const app = new App();

//# sourceMappingURL=index.672d4772.js.map
