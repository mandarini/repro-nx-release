import { lib1 } from '@repro-release/lib1';
import { lib2 } from '@repro-release/lib2';
import { lib3 } from '@repro-release/lib3';
import { lib4 } from '@repro-release/lib4';
import { lib5 } from '@repro-release/lib5';

export function main() {
  console.log(lib1());
  console.log(lib2());
  console.log(lib3());
  console.log(lib4());
  console.log(lib5());
  return 'main';
}
