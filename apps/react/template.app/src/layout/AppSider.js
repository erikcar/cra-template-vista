import { Layout, Menu } from "antd";
import { HomeOutlined,MenuOutlined,AppleOutlined } from "@ant-design/icons";
import React, { useState } from "react";
import SubMenu from "antd/lib/menu/SubMenu";

const { Sider } = Layout;

export function AppSider({model}) {
  const [collapsed, collapse] = useState(true);

  return (
    <Sider trigger={null} collapsible collapsed={collapsed}>
      <MenuOutlined className="menu-icon "   onClick={() => collapse(!collapsed)} />
      <Menu theme="dark" className="sider-menu" mode="inline" defaultSelectedKeys={["1"]}>
        <Menu.Item key="1" onClick={ ()=>model.Intent("NAVIGATE","/")} icon={<HomeOutlined />}>
            Home
        </Menu.Item>
        <SubMenu key="2" icon={<HomeOutlined />} title={!collapsed && "Utente"}>
          <Menu.Item key="ACC" onClick={ ()=>model.Intent("NAVIGATE","/profile")} icon={<AppleOutlined />}>
            Profilo
          </Menu.Item>
          <Menu.Item key="DASH" onClick={ ()=>model.Intent("NAVIGATE","/dashboard")} icon={<AppleOutlined />}>
            Dashboard
          </Menu.Item>
        </SubMenu>
      </Menu>
    </Sider>
  );
}