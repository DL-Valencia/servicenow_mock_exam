import React from 'react';

const TOKEN_REGEX =
  /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|(https?:\/\/[^\s<>()]+))/g;

/**
 * Parses inline markdown tokens:
 * - [label](https://...) -> clickable hyperlink
 * - **bold** -> <strong>
 * - `code` -> <code>
 * - bare https://... -> clickable hyperlink
 */
function renderInlineTokens(text, keyPrefix = 'tok') {
  if (!text) return null;
  const nodes = [];
  let lastIndex = 0;
  let match;
  let i = 0;

  TOKEN_REGEX.lastIndex = 0;
  while ((match = TOKEN_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const [fullMatch, , linkLabel, linkUrl, boldText, codeText, bareUrl] = match;

    if (linkLabel && linkUrl) {
      nodes.push(
        <a
          key={`${keyPrefix}-link-${i++}`}
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="explanation-link"
          onClick={(e) => e.stopPropagation()}
        >
          <span>{linkLabel}</span>
          <span className="explanation-link-arrow" aria-hidden="true">
            ↗
          </span>
        </a>
      );
    } else if (boldText !== undefined) {
      nodes.push(<strong key={`${keyPrefix}-b-${i++}`}>{boldText}</strong>);
    } else if (codeText !== undefined) {
      nodes.push(
        <code key={`${keyPrefix}-code-${i++}`} className="explanation-inline-code">
          {codeText}
        </code>
      );
    } else if (bareUrl) {
      // Strip trailing punctuation if accidentally captured
      const cleanUrl = bareUrl.replace(/[.,;:!?]+$/, '');
      const trailing = bareUrl.slice(cleanUrl.length);
      nodes.push(
        <a
          key={`${keyPrefix}-url-${i++}`}
          href={cleanUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="explanation-link"
          onClick={(e) => e.stopPropagation()}
        >
          <span>{cleanUrl}</span>
          <span className="explanation-link-arrow" aria-hidden="true">
            ↗
          </span>
        </a>
      );
      if (trailing) nodes.push(trailing);
    } else {
      nodes.push(fullMatch);
    }

    lastIndex = TOKEN_REGEX.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

const LEARN_MORE_SPLIT_REGEX = /(?:^|\n+)\s*(?:\*\*Learn more:?\*\*|Learn more:)\s*/i;

export default function ExplanationContent({ text, fallbackText = '' }) {
  const raw = String(text || fallbackText || '').trim();
  if (!raw) return null;

  // Split explanation into main body and "Learn more:" reference section if present
  const learnMoreMatch = raw.match(LEARN_MORE_SPLIT_REGEX);
  let bodyText = raw;
  let learnMoreText = '';

  if (learnMoreMatch && learnMoreMatch.index !== undefined) {
    bodyText = raw.slice(0, learnMoreMatch.index).trim();
    learnMoreText = raw.slice(learnMoreMatch.index + learnMoreMatch[0].length).trim();
  }

  const paragraphs = bodyText
    ? bodyText
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
    : [];

  return (
    <div className="explanation-rich-content">
      {paragraphs.map((para, idx) => (
        <p key={idx} className="explanation-paragraph">
          {renderInlineTokens(para, `p-${idx}`)}
        </p>
      ))}

      {learnMoreText && (
        <div className="explanation-learn-more">
          <span className="explanation-learn-more-label">🔗 Learn more:</span>
          <span className="explanation-learn-more-links">
            {renderInlineTokens(learnMoreText, 'lm')}
          </span>
        </div>
      )}
    </div>
  );
}
