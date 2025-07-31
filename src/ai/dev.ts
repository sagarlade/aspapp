import { config } from 'dotenv';
config();

// This file is used for local development.
// It is not used in production.

import '@/ai/flows/generate-whatsapp-summary.ts';
import '@/ai/flows/generate-consolidated-report.ts';
