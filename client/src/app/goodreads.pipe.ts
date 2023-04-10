import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'goodreads'
})
export class GoodreadsPipe implements PipeTransform {

  transform(url: string): string {
    return `https://www.goodreads.com${url}`;
  }

}
