import React from 'react';
import * as Sentry from '@sentry/react';
import './ErrorBoundary.css';
import { MdError } from 'react-icons/md';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo,
    });
    Sentry.captureException(error, { contexts: { react: errorInfo } });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // 앱 톤에 맞춘 오류 화면(AUDIT D-4) — 예전엔 파란 버튼·직접 쓴 색·"클릭해서" 문구였음
      return (
        <div className="eb-screen" role="alert">
          <MdError className="eb-icon" aria-hidden="true" />
          <h1 className="eb-title">잠깐 문제가 생겼어요</h1>
          <p className="eb-desc">
            앱을 쓰던 중 예상하지 못한 오류가 났어요.<br />아래 버튼을 눌러 다시 시도해 주세요.
          </p>

          {import.meta.env.DEV && this.state.error && (
            <details className="eb-dev">
              <summary>개발자 정보 (펼치기)</summary>
              <pre>
                {this.state.error.toString()}
                {'\n\n'}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}

          <button type="button" className="eb-btn" onClick={this.handleReset}>다시 시도</button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default Sentry.withProfiler(ErrorBoundary);
