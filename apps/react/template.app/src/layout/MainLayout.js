import { Outlet } from "react-router-dom";
import { Layout } from "antd";
import { AppSider } from "./AppSider";
import React from 'react';
import { useApp } from "@vista/react";

const { Header, Content } = Layout;

export function MainLayout({ model }) {
  const App = useApp();
  return (
    <Layout className="layout">
      <AppSider model={App.model}></AppSider>
      <Layout className="layout">
      <Header
        className="layout-bg"
        style={{ paddingLeft: 0, height: 60, margin: "0px 16px", borderBottom: "1px solid green"  }}
      >
        HEADER
      </Header>
        <Content
          className="layout-bg layout-content"
          style={{
            margin: "8px 16px",
            padding: 0,
            minHeight: 280,
          }}
        >
          <Outlet></Outlet>  
        </Content>
      </Layout>
    </Layout>
  );
}