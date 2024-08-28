
// Get HTML Elements
const signupForm = document.getElementById('signup-form');
const signinForm = document.getElementById('signin-form');
const forgotPasswordLink = document.getElementById('forgot-password');

// JSON Data Storage
let userData = [];

// Function to Save Data to CSV File
function saveDataToCSV(data) {
    const header = ['Full Name', 'Email', 'Password', 'Mobile', 'Gender', 'Country'];
    const rows = [header];
    data.forEach(user => rows.push([user.fullname, user.email, user.password, user.mobile, user.gender, user.country]));
    
    let csvContent = "data:text/csv;charset=utf-8," 
        + rows.map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "user_data.csv");
    document.body.appendChild(link); // Required for FF
    link.click();
}

// Load Data from CSV File
function loadDataFromCSV() {
    // This would require server-side support to read the file
    // For simplicity, we're simulating this with localStorage
    const storedData = localStorage.getItem('userData');
    if (storedData) {
        userData = JSON.parse(storedData);
    }
}

// Load Data on Page Load
loadDataFromCSV();

// Remove Duplicates from User Data
function removeDuplicates(data) {
    let unique = [];
    data.forEach(element => {
        if (!unique.some(u => u.email === element.email)) {
            unique.push(element);
        }
    });
    return unique;
}

// Sign Up Functionality
signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const fullname = document.getElementById('fullname').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const mobile = document.getElementById('mobile').value;
    const gender = document.getElementById('gender').value;
    const country = document.getElementById('country').value;

    // Validate Fields
    if (fullname && email && password && mobile && gender && country) {
        // Check if Email Already Exists
        const existingUser = userData.find((user) => user.email === email);
        if (!existingUser) {
            // Add New User to Data
            userData.push({ fullname, email, password, mobile, gender, country });
            // Remove Duplicates
            userData = removeDuplicates(userData);
            // Save Data to CSV File
            saveDataToCSV(userData);
            alert('Sign Up Successful!');
          //  window.location.href = 'hello.html'; // Redirect to hello.html
        } else {
            alert('Email Already Exists!');
        }
    } else {
        alert('Please Fill All Fields!');
    }
});

// Sign In Functionality
signinForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('signin-email').value;
    const password = document.getElementById('signin-password').value;
    // Validate Email and Password
    if (email && password) {
        // Check if User Exists
        const existingUser = userData.find((user) => user.email === email && user.password === password);
        if (existingUser) {
            alert('Sign In Successful!');
            window.location.href = 'action.html'; // Redirect to hello.html
        } else {
            alert('Invalid Email or Password!');
        }
    } else {
        alert('Please Fill All Fields!');
    }
});

// Reset Password Functionality
forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    const email = prompt('Enter Your Email:');
    if (email) {
        // Check if User Exists
        const existingUser = userData.find((user) => user.email === email);
        if (existingUser) {
            // Reset Password
            const newPassword = prompt('Enter New Password:');
            if (newPassword) {
                existingUser.password = newPassword;
                // Save Data to CSV File
                saveDataToCSV(userData);
                alert('Password Reset Successful!');
            }
        } else {
            alert('Email Not Found!');
        }
    }
});