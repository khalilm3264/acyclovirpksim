/*
 * AyFlux — educational acyclovir and valacyclovir pharmacokinetics simulator.
 * Copyright (C) 2026 Muhammad Khalil
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * This file is part of AyFlux, licensed under the GNU Affero General
 * Public License version 3. It is provided without warranty.
 * See LICENSE: https://github.com/khalilm3264/acyclovirpksim/blob/main/LICENSE
 * Contact: contact@ayflux.org
 */
'use strict';
// Dedicated same-origin Web Worker running the shared PK model.
importScripts('/assets/pk-engine.js');
self.onmessage=event=>{
  const {id,config}=event.data;
  try { self.postMessage({id,data:self.RenalPKV7.simulateMany(config)}); }
  catch(error) { self.postMessage({id,error:error instanceof Error?error.message:String(error)}); }
};
