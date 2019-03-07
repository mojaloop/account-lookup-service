
exports.seed = function(knex, Promise) {
  // Deletes ALL existing entries
  return knex('endpointType').del()
    .then(function () {
      // Inserts seed entries
      return knex('endpointType').insert([
        {name: 'MSISDN', description: 'Mobile Station International Subscriber Directory Number is a number used to identify a mobile phone number internationally'},
        {name: 'ACCOUNT_ID', description: 'A Parties Account Identity that is registered to a Participant'},
      ]);
    });
};
