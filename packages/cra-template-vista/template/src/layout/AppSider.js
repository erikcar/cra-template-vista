import { Layout, Menu } from "antd";
import {
  ShoppingCartOutlined,
  TeamOutlined,
  HomeOutlined,MenuOutlined,AppleOutlined
} from "@ant-design/icons";
import { Link } from "react-router-dom";
import { GiFarmer, GiCook } from "react-icons/gi";
import { useState } from "react";
import SubMenu from "antd/lib/menu/SubMenu";
//import { logo } from "../assets/icons";

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
        <SubMenu key="2" icon={<GiCook />} title={!collapsed && "Utente"}>
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