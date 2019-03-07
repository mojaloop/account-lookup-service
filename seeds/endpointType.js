
exports.seed = function(knex, Promise) {
  // Deletes ALL existing entries
  return knex('endpointType').del()
    .then(function () {
      // Inserts seed entries
      return knex('endpointType').insert([
        {type: 'URL', description: 'REST URLs'}
      ]);
    });
};
