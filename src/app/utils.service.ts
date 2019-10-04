import { Injectable } from '@angular/core';

@Injectable()
export class UtilsService {

  constructor(  ) {}

  prettifyDate(d: string) {
    if ( !d ) { return ''; }
    const date = new Date(d);
    return date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear();
  }

  formatDuration(secs: number) {

    if ( !secs ) { return ''; }

    const d = Math.floor(secs / (3600 * 24));
    const h = Math.floor(secs % (3600 * 24) / 3600);
    const m = Math.floor(secs % 3600 / 60);
    const s = Math.floor(secs % 3600 % 60);

    let r = '';
    if ( d > 0 ) { r += d + 'd '; }
    if ( h > 0 || d > 0 ) { r += h + 'h '; }
    if ( m > 0 || h > 0 || d > 0 ) { r += this.padInt(m, 2) + 'm '; }
    if ( s > 0 ||  m > 0 || h > 0 || d > 0) { r += this.padInt(s, 2) + 's'; }

    return r;

  }

  padInt(numb: number, size: number) {
    let outp = numb.toString();
    while (outp.length < size) { outp = '0' + outp; }
    return outp;
  }

  nextLetter(c: String) {
    return String.fromCharCode(c.charCodeAt(0) + 1);
  }


}
