import mongoose from 'mongoose';
import { z } from 'zod';
import { objectId } from '@kosha/shared';

/** Aggregation pipelines don't auto-cast, so ids must be real ObjectIds there. */
export const toObjectId = (id) => new mongoose.Types.ObjectId(String(id));

/** Route params schema for `/:id`. */
export const idParams = z.object({ id: objectId });

export const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
