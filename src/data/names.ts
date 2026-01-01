export const FIRST_NAMES = [
  'James', 'John', 'Michael', 'David', 'Chris', 'Daniel', 'Marcus', 'Antonio',
  'Darius', 'Tyrone', 'Brandon', 'Justin', 'Kevin', 'Derek', 'Ryan', 'Tyler',
  'Cameron', 'Jordan', 'Jamal', 'Terrell', 'Andre', 'Devin', 'Malik', 'Lamar',
  'Patrick', 'Travis', 'Jalen', 'Kyler', 'Josh', 'Trey', 'Jaylen', 'Deshaun',
  'Dak', 'Carson', 'Baker', 'Joe', 'Justin', 'Zach', 'Trevor', 'Mac',
];

export const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Davis', 'Miller', 'Wilson',
  'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin',
  'Thompson', 'Robinson', 'Clark', 'Lewis', 'Walker', 'Hall', 'Allen', 'Young',
  'King', 'Wright', 'Hill', 'Scott', 'Green', 'Adams', 'Baker', 'Nelson',
  'Carter', 'Mitchell', 'Roberts', 'Turner', 'Phillips', 'Campbell', 'Parker', 'Evans',
];

export const getRandomName = () => ({
  firstName: FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)],
  lastName: LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)],
});