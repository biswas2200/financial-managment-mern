/**
 * Shapes every document sent over the API: `_id` becomes `id`, and internal
 * fields (`__v`, `passwordHash`) are never serialised.
 */
export function toJSONPlugin(schema) {
  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform(_doc, ret) {
      if (ret._id) ret.id = ret._id.toString();
      delete ret._id;
      delete ret.passwordHash;
      return ret;
    },
  });
}
