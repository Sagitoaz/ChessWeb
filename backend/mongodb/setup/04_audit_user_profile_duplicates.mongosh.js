// Audit duplicate user_profiles by username/email/googleId.
// Usage:
// mongosh "$env:MONGODB_URI" --file backend/mongodb/setup/04_audit_user_profile_duplicates.mongosh.js

const DB_NAME = process?.env?.MONGODB_DB_NAME || 'chessweb_dev'
const appDb = db.getSiblingDB(DB_NAME)

function printDuplicateGroups(fieldName) {
  const groups = appDb.user_profiles.aggregate([
    {
      $match: {
        [fieldName]: { $type: 'string', $ne: '' },
      },
    },
    {
      $group: {
        _id: `$${fieldName}`,
        count: { $sum: 1 },
        docs: {
          $push: {
            _id: '$_id',
            username: '$username',
            email: '$email',
            googleId: '$googleId',
            createdAt: '$createdAt',
            updatedAt: '$updatedAt',
          },
        },
      },
    },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1, _id: 1 } },
  ]).toArray()

  print(`\n[field=${fieldName}] duplicate groups: ${groups.length}`)
  groups.forEach((group) => {
    printjson({
      value: group._id,
      count: group.count,
      docs: group.docs,
    })
  })
}

print(`Auditing user_profiles in database: ${DB_NAME}`)
printDuplicateGroups('username')
printDuplicateGroups('email')
printDuplicateGroups('googleId')
