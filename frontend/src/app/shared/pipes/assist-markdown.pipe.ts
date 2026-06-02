import { Pipe, PipeTransform, SecurityContext, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';

marked.setOptions({
  breaks: true,
  gfm: true,
});

@Pipe({ name: 'assistMarkdown', standalone: true })
export class AssistMarkdownPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(value: string | null | undefined): SafeHtml {
    const text = String(value ?? '').trim();
    if (!text) {
      return this.sanitizer.bypassSecurityTrustHtml('');
    }
    const html = marked.parse(text, { async: false }) as string;
    const safe = this.sanitizer.sanitize(SecurityContext.HTML, html);
    return this.sanitizer.bypassSecurityTrustHtml(safe ?? '');
  }
}
