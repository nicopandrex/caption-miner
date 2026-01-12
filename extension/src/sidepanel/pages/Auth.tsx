import React, { useState } from "react";
import * as api from "../../lib/api";

interface AuthProps {
  onAuth: () => void;
}

export default function Auth({ onAuth }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        await api.login(email, password);
      } else {
        await api.register(email, password);
      }
      onAuth();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h2 className="font-bold mb-2" style={{ fontSize: "20px" }}>
        Caption Miner
      </h2>
      <p className="text-sm text-gray mb-4">
        {isLogin ? "Sign in to continue" : "Create an account"}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label className="label">Email</label>
          <input
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="label">Password</label>
          <input
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>

        {error && <p className="text-sm text-red">{error}</p>}

        <button type="submit" className="button" disabled={loading}>
          {loading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
        </button>

        <button
          type="button"
          className="button button-secondary"
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin ? "Create Account" : "Already have an account?"}
        </button>
      </form>
    </div>
  );
}
