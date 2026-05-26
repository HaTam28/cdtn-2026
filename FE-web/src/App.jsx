import './App.css'

function App() {
  return (
    <div className="page-shell">
      {/* <header className="brand-bar" aria-label="Hoshimoto Việt Nam">
        <img src="/src/assets/logo.png" alt="Hoshimoto Việt Nam" />
      </header> */}

      <main className="login-layout">
        <section className="login-panel" aria-labelledby="login-title">
          <img
            className="login-logo"
            src="/src/assets/logo.png"
            alt="Hoshimoto Việt Nam"
          />

          <div className="login-copy">
            <p className="eyebrow">Cổng quản lý kho</p>
            <h1 id="login-title">Đăng nhập hệ thống</h1>
            <p className="supporting-text">
              Quản lý kho, theo dõi xuất nhập và kiểm soát tồn kho trong một giao
              diện tập trung.
            </p>
          </div>

          <form className="login-form">
            <label className="input-field">
              <span className="sr-only">Tài khoản</span>
              <span className="input-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.33 0-6 1.79-6 4v1h12v-1c0-2.21-2.67-4-6-4Z" />
                </svg>
              </span>
              <input type="text" name="username" placeholder="Tài khoản" />
            </label>

            <label className="input-field">
              <span className="sr-only">Mật khẩu</span>
              <span className="input-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M17 8h-1V6a4 4 0 1 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm-6 7.73V17a1 1 0 0 0 2 0v-1.27a2 2 0 1 0-2 0ZM10 8V6a2 2 0 1 1 4 0v2Z" />
                </svg>
              </span>
              <input
                type="password"
                name="password"
                placeholder="Mật khẩu"
              />
            </label>

            <div className="form-meta">
              <label className="remember-me">
                <input type="checkbox" name="remember" />
                <span>Ghi nhớ đăng nhập</span>
              </label>
              <a href="/" onClick={(event) => event.preventDefault()}>
                Quên mật khẩu?
              </a>
            </div>

            <button type="submit" className="login-button">
              Đăng nhập
            </button>
          </form>
        </section>
      </main>
    </div>
  )
}

export default App
