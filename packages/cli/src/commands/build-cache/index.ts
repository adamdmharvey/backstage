/*
 * Copyright 2020 Spotify AB
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Command } from 'commander';
import { run } from 'helpers/run';
import { Cache } from './cache';
import { parseOptions } from './options';

function print(msg: string) {
  process.stdout.write(`[build-cache] ${msg}\n`);
}

/*
 * The build-cache command is used to make builds a no-op if there are no changes to the package.
 * It supports both local development where the output directory remains intact, as well as CI
 * where the output directory is stored in a separate cache dir.
 */
export default async (cmd: Command, args: string[]) => {
  const options = await parseOptions(cmd);

  const key = await Cache.readInputKey(options.inputs);
  if (!key) {
    print('input directory is dirty, skipping cache');
    await run(args[0], args.slice(1));
    return;
  }

  const cache = await Cache.read(options);

  const cacheResult = cache.query(key);
  if (cacheResult.hit) {
    if (cacheResult.copy) {
      print('external cache hit, copying archive to output folder');
      await cacheResult.copy(options.output);
    } else {
      print('cache hit, nothing to be done');
    }
    return;
  }

  print('cache miss, need to build');

  await run(args[0], args.slice(1));

  print('caching build output');
  await cacheResult.archive(options.output, options.maxCacheEntries);
};
